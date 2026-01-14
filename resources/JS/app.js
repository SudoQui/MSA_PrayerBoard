// ---------- Config ----------
const ADDRESS = "11 Kirinari St, Bruce ACT 2617";
const TZ = "Australia/Sydney";
const METHOD = 3;

// ---------- Helpers ----------
const pad2 = (n) => String(n).padStart(2, "0");

const toMin = (t) => {
  const s = t.trim().toUpperCase();
  const am = s.endsWith("AM"),
    pm = s.endsWith("PM");
  let [h, m] = s.replace(/AM|PM/, "").trim().split(":").map(Number);
  if (pm && h !== 12) h += 12;
  if (am && h === 12) h = 0;
  return h * 60 + m;
};

const fmt12 = (hhmm) => {
  const [h0, m0] = hhmm.split(":").map(Number);
  let h = h0 % 12;
  if (h === 0) h = 12;
  const m = pad2(m0);
  return `${h}:${m} ${h0 >= 12 ? "PM" : "AM"}`;
};

const addMinutes = (hhmm, mins) => {
  let [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m + mins;
  total = (total + 1440) % 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
};

const nowMinutesTZ = (tz) => {
  const [hh, mm] = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .split(":")
    .map(Number);
  return hh * 60 + mm;
};

function formatClockWithSpacedColon(date, tz = TZ) {
  const [hh, mm] = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .split(":")
    .map(Number);

  let h = hh % 12;
  if (h === 0) h = 12;
  return `${h} : ${pad2(mm)}`;
}

function tickClock() {
  const el = document.getElementById("CurrentTime");
  if (!el) return;
  el.textContent = formatClockWithSpacedColon(new Date(), TZ);
}

// ---------- Core render ----------
async function refreshBoard() {
  const d = new Date();
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();

  const monthShort = d.toLocaleString("en-AU", { month: "short" });

  const url =
    `https://api.aladhan.com/v1/timingsByAddress/${dd}-${mm}-${yyyy}` +
    `?address=${encodeURIComponent(ADDRESS)}` +
    `&timezonestring=${encodeURIComponent(TZ)}` +
    `&method=${METHOD}`;

  let data;
  try {
    const res = await fetch(url, { cache: "no-store" });
    data = await res.json();
  } catch (e) {
    console.error("Fetch error:", e);
    return;
  }

  const t = data.data.timings;
  const hijri = data.data.date.hijri;

  const prayers = {
    Fajr: t.Fajr,
    Dhuhr: t.Dhuhr,
    Asr: t.Asr,
    Maghrib: t.Maghrib,
    Isha: t.Isha,
  };

  const order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  // iqamah = adhan + 34 min for screenshot vibe
  // tweak these however you like
  const iqamah = {
    Fajr: addMinutes(prayers.Fajr, 34),
    Dhuhr: addMinutes(prayers.Dhuhr, 34),
    Asr: addMinutes(prayers.Asr, 34),
    Maghrib: addMinutes(prayers.Maghrib, 34),
    Isha: addMinutes(prayers.Isha, 34),
  };

  // Dates
  const greg = document.getElementById("gregDate");
  const isl = document.getElementById("islamicDate");
  if (greg) greg.textContent = `${d.getDate()} ${monthShort}`;
  if (isl) isl.textContent = `${hijri.day} ${hijri.month.en.slice(0, 3)}`;

  // Fill rows (12 hour like screenshot)
  document.getElementById("FajrAdhan").textContent = fmt12(prayers.Fajr);
  document.getElementById("FajrIqamah").textContent = fmt12(iqamah.Fajr);

  document.getElementById("DhuhrAdhan").textContent = fmt12(prayers.Dhuhr);
  document.getElementById("DhuhrIqamah").textContent = fmt12(iqamah.Dhuhr);

  document.getElementById("AsrAdhan").textContent = fmt12(prayers.Asr);
  document.getElementById("AsrIqamah").textContent = fmt12(iqamah.Asr);

  document.getElementById("MaghribAdhan").textContent = fmt12(prayers.Maghrib);
  document.getElementById("MaghribIqamah").textContent = fmt12(iqamah.Maghrib);

  document.getElementById("IshaAdhan").textContent = fmt12(prayers.Isha);
  document.getElementById("IshaIqamah").textContent = fmt12(iqamah.Isha);

  // current / next logic
  const nowMin = nowMinutesTZ(TZ);
  const adhanMins = order.map((n) => toMin(prayers[n]));
  let idxCurrent = -1;
  adhanMins.forEach((m, i) => {
    if (nowMin >= m) idxCurrent = i;
  });

  order.forEach((name, i) => {
    const row = document.getElementById(name);
    if (!row) return;
    row.classList.remove("current", "past");
    if (i < idxCurrent) row.classList.add("past");
    if (i === idxCurrent) row.classList.add("current");
  });

  // compute next prayer and countdown (wrap after Isha to next day Fajr)
  const nextIdx = idxCurrent < 0 ? 0 : (idxCurrent + 1) % order.length;
  let nextTime = toMin(prayers[order[nextIdx]]);
  let delta = nextTime - nowMin;
  if (delta <= 0) delta += 1440;

  const hLeft = Math.floor(delta / 60);
  const mLeft = delta % 60;

  const nextLabel = order[nextIdx].toLowerCase();
  const next = document.getElementById("NextPrayer");
  if (next) next.textContent = `${hLeft} hrs ${mLeft} mins till ${nextLabel}`;
}

// Start
tickClock();
setInterval(tickClock, 1000);

refreshBoard();
setInterval(refreshBoard, 20000);
