# Secure remote access

For off-campus administration, use a university-approved private overlay network such as Tailscale or Raspberry Pi Connect. Do not expose TCP port 22 directly to the public internet.

## Recommended Tailscale setup

On the Raspberry Pi:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh
```

Open the authentication URL printed in the terminal and sign in with the account that will administer the wallboard.

Verify:

```bash
tailscale status
tailscale ip -4
```

Install Tailscale on the administrator computer and sign in to the same tailnet. Connect using either the MagicDNS hostname or the Tailscale IP:

```bash
ssh prayerboard@msa-prayerboard
```

or:

```bash
ssh prayerboard@100.x.y.z
```

For a permanently installed display, review device key expiry in the Tailscale admin console. Disabling expiry improves availability but should only be used for a physically secured device, with access revoked immediately if the Pi is lost or replaced.

## Security requirements

* Obtain university IT approval before installing a remote access agent.
* Never configure router port forwarding for SSH.
* Do not permit direct root login.
* Restrict remote access to the named administrators.
* Keep Raspberry Pi OS and Tailscale updated.
* Retain a strong local account password even when Tailscale SSH is enabled.
* Record the device owner, location, hostname and recovery contact.

## Alternative

Raspberry Pi Connect supports remote shell and browser-based screen sharing without manual firewall configuration. It is useful when graphical support is required, but personal Connect accounts are intended for one user. Use an organisation account when access must be shared by a university team.
