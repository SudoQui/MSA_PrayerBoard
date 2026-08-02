# Wallboard validation checks

After deployment, verify the following:

1. Adhan and iqamah times display with AM or PM.
2. Before Fajr, no prior prayer remains highlighted.
3. From Fajr until 119 minutes after Fajr, the Fajr row is highlighted.
4. At 120 minutes after Fajr, the Fajr highlight clears.
5. At Dhuhr, the Dhuhr row becomes highlighted.
6. Closing Chromium causes the kiosk launcher to reopen it.
7. Disconnecting the network keeps the cached schedule visible.
8. Reconnecting the network refreshes the schedule without restarting the Pi.
