//! Drives the `tailscale` CLI already installed on the machine.
//!
//! UMBRA does not implement a data plane: Headscale and Tailscale are the VPN.
//! What this client adds is that the user never has to open a terminal to use
//! it — the commands the dashboard used to hand out as copy-paste are run here
//! instead.
//!
//! Everything that changes state needs root, so those calls go through `pkexec`
//! and the desktop prompts once, rather than the app asking for a password it
//! has no business holding.

use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct TailscaleStatus {
    /// False when the binary is missing: the UI offers install instructions
    /// rather than failing with a command-not-found.
    pub installed: bool,
    pub running: bool,
    /// This machine's Tailscale IP, once it has joined.
    pub ip: Option<String>,
    /// IP of the exit node currently in use, if any.
    pub exit_node: Option<String>,
    pub backend_state: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawStatus {
    #[serde(rename = "BackendState")]
    backend_state: Option<String>,
    #[serde(rename = "Self")]
    self_node: Option<RawSelf>,
    #[serde(rename = "ExitNodeStatus")]
    exit_node_status: Option<RawExitNode>,
}

#[derive(Debug, Deserialize)]
struct RawSelf {
    #[serde(rename = "TailscaleIPs")]
    ips: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct RawExitNode {
    #[serde(rename = "TailscaleIPs")]
    ips: Option<Vec<String>>,
}

fn binary_present() -> bool {
    Command::new("tailscale")
        .arg("version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Reads local state. Never needs privileges, so it is safe to poll.
#[tauri::command]
pub fn tailscale_status() -> TailscaleStatus {
    if !binary_present() {
        return TailscaleStatus {
            installed: false,
            running: false,
            ip: None,
            exit_node: None,
            backend_state: None,
        };
    }

    let output = Command::new("tailscale")
        .args(["status", "--json"])
        .output();

    let Ok(output) = output else {
        return TailscaleStatus {
            installed: true,
            running: false,
            ip: None,
            exit_node: None,
            backend_state: None,
        };
    };

    let raw: Option<RawStatus> = serde_json::from_slice(&output.stdout).ok();
    let Some(raw) = raw else {
        return TailscaleStatus {
            installed: true,
            running: false,
            ip: None,
            exit_node: None,
            backend_state: None,
        };
    };

    let first_v4 = |ips: &Option<Vec<String>>| -> Option<String> {
        ips.as_ref()
            .and_then(|v| v.iter().find(|ip| ip.contains('.')).cloned())
    };

    TailscaleStatus {
        installed: true,
        running: raw.backend_state.as_deref() == Some("Running"),
        ip: raw.self_node.as_ref().and_then(|s| first_v4(&s.ips)),
        exit_node: raw.exit_node_status.as_ref().and_then(|e| first_v4(&e.ips)),
        backend_state: raw.backend_state,
    }
}

fn run_privileged(args: &[&str]) -> Result<String, String> {
    // pkexec surfaces the desktop's own authentication dialog. The alternative
    // would be collecting a password in our window, which is exactly what a VPN
    // client should not be teaching people to do.
    let output = Command::new("pkexec")
        .arg("tailscale")
        .args(args)
        .output()
        .map_err(|e| format!("pkexec introuvable ou refusé : {e}"))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if err.is_empty() {
            "La commande tailscale a échoué".to_string()
        } else {
            err
        })
    }
}

/// First connection: joins the mesh with a pre-auth key and selects the exit
/// node in one step — the same command the dashboard used to hand out.
#[tauri::command]
pub fn tailscale_join(
    login_server: String,
    auth_key: String,
    exit_node: String,
) -> Result<String, String> {
    run_privileged(&[
        "up",
        &format!("--login-server={login_server}"),
        &format!("--authkey={auth_key}"),
        &format!("--exit-node={exit_node}"),
        "--accept-routes",
        "--accept-dns=false",
        "--reset",
    ])
}

/// Already joined: switching exit node does not need a key.
#[tauri::command]
pub fn tailscale_set_exit_node(exit_node: String) -> Result<String, String> {
    run_privileged(&["set", &format!("--exit-node={exit_node}")])
}

/// Stops routing through an exit node without leaving the mesh.
#[tauri::command]
pub fn tailscale_clear_exit_node() -> Result<String, String> {
    run_privileged(&["set", "--exit-node="])
}
