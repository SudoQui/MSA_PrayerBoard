// ---------- Config ----------
const ADDRESS = "11 Kirinari St, Bruce ACT 2617";
const TZ = "Australia/Sydney";
const METHOD = 3; 

// ---------- Helpers ----------
const pad2 = n => String(n).padStart(2, "0");
const toMin = t => {
  const s = t.trim().toUpperCase();
  const am = s.endsWith("AM"), pm = s.endsWith("PM");
  let [h, m] = s.replace(/AM|PM/,"").trim().split(":").map(Number);
  if (pm && h !== 12) h += 12;
  if (am && h === 12) h = 0;
  return h*60 + m;
};
const fmt24 = (hhmm) => {
  let [h, m] = hhmm.split(":").map(Number);
  return `${pad2(h)}:${pad2(m)}`;
};

const addMinutes = (hhmm, mins) => {
  let [h,m] = hhmm.split(":").map(Number);
  let total = h*60 + m + mins;
  total = (total + 1440) % 1440;
  return `${pad2(Math.floor(total/60))}:${pad2(total%60)}`;
};
const nowMinutesTZ = (tz) => {
  const [hh, mm] = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date()).split(":").map(Number);
  return hh*60 + mm;
};

// ---------- Core render ----------
async function refreshBoard() {
  // recompute date each run
  const d = new Date();
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const monthName = d.toLocaleString('default', { month: 'long' });

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
    Fajr:    t.Fajr,
    Dhuhr:   t.Dhuhr,
    Asr:     t.Asr,
    Maghrib: t.Maghrib,
    Isha:    t.Isha
  };
  const order = ["Fajr","Dhuhr","Asr","Maghrib","Isha"];

  // iqamah = adhan + 15 min (adjust as you like)
  const iqamah = {
    Fajr:    addMinutes(prayers.Fajr, 15),
    Dhuhr:   addMinutes(prayers.Dhuhr, 15),
    Asr:     addMinutes(prayers.Asr, 15),
    Maghrib: addMinutes(prayers.Maghrib, 15),
    Isha:    addMinutes(prayers.Isha, 15),
  };

  // DOM fill: dates and clock
  document.getElementById("gregDate").textContent   = `${d.getDate()} ${monthName}`;
  document.getElementById("islamicDate").textContent = `${hijri.day} ${hijri.month.en}`;
  function format12NoAmPm(date, tz = "Australia/Sydney") {
    // Get hours/minutes in 24h first
    const [hh, mm] = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(date).split(":").map(Number);

    // Convert to 12h without AM/PM
    let h = hh % 12;
    if (h === 0) h = 12; // midnight/noon edge cases

    return `${h}:${mm.toString().padStart(2, "0")}`;
};

    document.getElementById("CurrentTime").textContent = format12NoAmPm(new Date());


  // DOM fill: adhan/iqamah per prayer
  document.getElementById("FajrAdhan").textContent     = fmt24(prayers.Fajr);
  document.getElementById("FajrIqamah").textContent    = fmt24(iqamah.Fajr);
  document.getElementById("DhuhrAdhan").textContent    = fmt24(prayers.Dhuhr);
  document.getElementById("DhuhrIqamah").textContent   = fmt24(iqamah.Dhuhr);
  document.getElementById("AsrAdhan").textContent      = fmt24(prayers.Asr);
  document.getElementById("AsrIqamah").textContent     = fmt24(iqamah.Asr);
  document.getElementById("MaghribAdhan").textContent  = fmt24(prayers.Maghrib);
  document.getElementById("MaghribIqamah").textContent = fmt24(iqamah.Maghrib);
  document.getElementById("IshaAdhan").textContent     = fmt24(prayers.Isha);
  document.getElementById("IshaIqamah").textContent    = fmt24(iqamah.Isha);

  // current / next logic
  const nowMin = nowMinutesTZ(TZ);
  const adhanMins = order.map(n => toMin(prayers[n]));
  let idxCurrent = -1;
  adhanMins.forEach((m, i) => { if (nowMin >= m) idxCurrent = i; });

  // tag rows
  order.forEach((name, i) => {
    const row = document.getElementById(name); // <div id="Fajr"> etc
    if (!row) return;
    row.classList.remove("current","past");
    if (i < idxCurrent) row.classList.add("past");
    if (i === idxCurrent) row.classList.add("current");
  });

  // compute next prayer and countdown (wrap after Isha to next day Fajr)
  const nextIdx = idxCurrent < 0 ? 0 : (idxCurrent + 1) % order.length;
  let nextTime = toMin(prayers[order[nextIdx]]);
  let delta = nextTime - nowMin;
  if (delta <= 0) delta += 1440; // wrap to next day

  const hLeft = Math.floor(delta / 60);
  const mLeft = delta % 60;
  document.getElementById("NextPrayer").textContent =
    `${hLeft} hrs ${mLeft} mins till ${order[nextIdx]}`;
}

// run now, then every 20s
refreshBoard();
setInterval(refreshBoard, 20000);
