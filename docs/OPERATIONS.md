# Basic operations

## Restart the kiosk browser

```bash
pkill chromium
```

The kiosk launcher should reopen Chromium automatically.

## Restart the Pi

```bash
sudo reboot
```

## Shut down safely

```bash
sudo poweroff
```

Wait for storage activity to stop before removing power.

## Check remote network status

```bash
tailscale status
```

## Check kiosk launcher

```bash
pgrep -af start-wallboard
pgrep -af chromium
```
