mod tailscale;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            tailscale::tailscale_status,
            tailscale::tailscale_join,
            tailscale::tailscale_set_exit_node,
            tailscale::tailscale_clear_exit_node,
        ])
        .run(tauri::generate_context!())
        .expect("error while running UMBRA");
}
