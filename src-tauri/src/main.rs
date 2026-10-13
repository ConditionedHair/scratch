#[cfg(not(target_os = "macos"))]
compile_error!("Scratch is only supported on macOS.");

fn main() {
    scratch_lib::run()
}
