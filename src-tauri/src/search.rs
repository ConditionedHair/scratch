use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::*;
use tantivy::{doc, Index, IndexReader, IndexWriter, ReloadPolicy};

use crate::{extract_title, generate_preview, id_from_abs_path, is_visible_notes_entry};

// Search result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub preview: String,
    pub modified: i64,
    pub score: f32,
}

// Tantivy search index state
pub struct SearchIndex {
    index: Index,
    reader: IndexReader,
    writer: Mutex<IndexWriter>,
    #[allow(dead_code)]
    schema: Schema,
    id_field: Field,
    title_field: Field,
    content_field: Field,
    modified_field: Field,
}

impl SearchIndex {
    pub fn new(index_path: &PathBuf) -> Result<Self> {
        // Build schema
        let mut schema_builder = Schema::builder();
        let id_field = schema_builder.add_text_field("id", STRING | STORED);
        let title_field = schema_builder.add_text_field("title", TEXT | STORED);
        let content_field = schema_builder.add_text_field("content", TEXT | STORED);
        let modified_field = schema_builder.add_i64_field("modified", INDEXED | STORED);
        let schema = schema_builder.build();

        // Create or open index
        std::fs::create_dir_all(index_path)?;
        let index = Index::create_in_dir(index_path, schema.clone())
            .or_else(|_| Index::open_in_dir(index_path))?;

        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()?;

        let writer = index.writer(50_000_000)?; // 50MB buffer

        Ok(Self {
            index,
            reader,
            writer: Mutex::new(writer),
            schema,
            id_field,
            title_field,
            content_field,
            modified_field,
        })
    }

    pub fn index_note(&self, id: &str, title: &str, content: &str, modified: i64) -> Result<()> {
        let mut writer = self.writer.lock().expect("search writer mutex");

        // Delete existing document with this ID
        let id_term = tantivy::Term::from_field_text(self.id_field, id);
        writer.delete_term(id_term);

        // Add new document
        writer.add_document(doc!(
            self.id_field => id,
            self.title_field => title,
            self.content_field => content,
            self.modified_field => modified,
        ))?;

        writer.commit()?;
        Ok(())
    }

    pub fn delete_note(&self, id: &str) -> Result<()> {
        let mut writer = self.writer.lock().expect("search writer mutex");
        let id_term = tantivy::Term::from_field_text(self.id_field, id);
        writer.delete_term(id_term);
        writer.commit()?;
        Ok(())
    }

    pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>> {
        let searcher = self.reader.searcher();
        let query_parser =
            QueryParser::for_index(&self.index, vec![self.title_field, self.content_field]);

        // Parse query, fall back to prefix query if parsing fails
        let query = query_parser
            .parse_query(query_str)
            .or_else(|_| query_parser.parse_query(&format!("{}*", query_str)))?;

        let top_docs = searcher.search(&query, &TopDocs::with_limit(limit))?;

        let mut results = Vec::with_capacity(top_docs.len());
        for (score, doc_address) in top_docs {
            let doc: TantivyDocument = searcher.doc(doc_address)?;

            let id = doc
                .get_first(self.id_field)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let title = doc
                .get_first(self.title_field)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let content = doc
                .get_first(self.content_field)
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let modified = doc
                .get_first(self.modified_field)
                .and_then(|v| v.as_i64())
                .unwrap_or(0);

            let preview = generate_preview(content);

            results.push(SearchResult {
                id,
                title,
                preview,
                modified,
                score,
            });
        }

        Ok(results)
    }

    pub fn rebuild_index(&self, notes_folder: &PathBuf, ignored_dirs: &[String]) -> Result<()> {
        let mut writer = self.writer.lock().expect("search writer mutex");
        writer.delete_all_documents()?;

        if notes_folder.exists() {
            use walkdir::WalkDir;
            for entry in WalkDir::new(notes_folder)
                .max_depth(10)
                .into_iter()
                .filter_entry(|e| is_visible_notes_entry(e, ignored_dirs))
                .flatten()
            {
                let file_path = entry.path();
                if !file_path.is_file() {
                    continue;
                }
                if let Some(id) = id_from_abs_path(notes_folder, file_path, ignored_dirs) {
                    if let Ok(content) = std::fs::read_to_string(file_path) {
                        let modified = entry
                            .metadata()
                            .ok()
                            .and_then(|m| m.modified().ok())
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_secs() as i64)
                            .unwrap_or(0);

                        let title = extract_title(&content);

                        writer.add_document(doc!(
                            self.id_field => id.as_str(),
                            self.title_field => title,
                            self.content_field => content.as_str(),
                            self.modified_field => modified,
                        ))?;
                    }
                }
            }
        }

        writer.commit()?;
        Ok(())
    }
}
