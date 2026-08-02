(() => {
  "use strict";

  const CONFIG = window.PRAYERBOARD_CONFIG;
  const ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const CACHE_KEY = "msaPrayerBoard.schedule.v2";
  const LAST_FETCH_KEY = "msaPrayerBoard.lastFetch.v2";

  let schedule = null;
  let activeDateKey = null;

  const pad2 = value => String(value).padStart(2, "0");

  function zonedParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: CONFIG.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    return Object.fromEntries(parts.map(part => [part.type, part.value]));
  }

  function dateKey(date = new Date()) {
    const p = zonedParts(date);
    return `${p.year}-${p.month}-${p.day}`;
  }

  function apiDate(date = new Date()) {
    const p = zonedParts(date);
    return `${p.day}-${p.month}-${p.year}`;
  }

  function nowMinutes() {
    const p = zonedParts();
    return Number(p.hour) * 60 + Number(p.minute);
  }

  function cleanTime(value) {
    return String(value || "").match(/\d{1,2}:\d{2}/)?.[0] || "--:--";
  }

  function toMinutes(value) {
    const [hour, minute] = cleanTime(value).split(":").map(Number);
    return hour * 60 + minute;
  }

  function format12Hour(value) {
    if (!/^\d{1,2}:\d{2}$/.test(cleanTime(value))) return "--:--";
    const totalMinutes = toMinutes(value);
    const hour24 = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${pad2(minute)} ${suffix}`;
  }

  function addMinutes(value, minutes) {
    const total = (toMinutes(value) + minutes + 1440) % 1440;
    return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
  }

  function resolveIqamah(name, adhan) {
    const rule = CONFIG.iqamah[name];
    if (!rule) return adhan;
    if (rule.mode === "fixed" && /^\d{1,2}:\d{2}$/.test(rule.time || "")) return rule.time;
    return addMinutes(adhan, Number(rule.minutes || 0));
  }

  function cacheRead() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function cacheWrite(value) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
    localStorage.setItem(LAST_FETCH_KEY, String(Date.now()));
  }

  function shouldFetch() {
    const lastFetch = Number(localStorage.getItem(LAST_FETCH_KEY) || 0);
    return !lastFetch || Date.now() - lastFetch >= CONFIG.apiRefreshHours * 3600000;
  }

  async function fetchSchedule() {
    const url = new URL(`https://api.aladhan.com/v1/timingsByAddress/${apiDate()}`);
    url.searchParams.set("address", CONFIG.address);
    url.searchParams.set("timezonestring", CONFIG.timezone);
    url.searchParams.set("method", String(CONFIG.calculationMethod));
    url.searchParams.set("school", String(CONFIG.school));

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Prayer API returned ${response.status}`);
    const payload = await response.json();
    if (payload.code !== 200 || !payload.data?.timings) throw new Error("Prayer API response was invalid");

    const timings = Object.fromEntries(ORDER.map(name => [name, cleanTime(payload.data.timings[name])]));
    return {
      dateKey: dateKey(),
      fetchedAt: Date.now(),
      hijri: `${payload.data.date.hijri.day} ${payload.data.date.hijri.month.en}`,
      timings
    };
  }

  function setStatus(message, warning = false) {
    const element = document.getElementById("boardStatus");
    element.textContent = message;
    element.classList.toggle("warning", warning);
  }

  function renderStatic() {
    if (!schedule) return;
    const today = new Intl.DateTimeFormat("en-AU", {
      timeZone: CONFIG.timezone,
      day: "numeric",
      month: "long"
    }).format(new Date());
    document.getElementById("gregDate").textContent = today;
    document.getElementById("islamicDate").textContent = schedule.hijri || "";

    ORDER.forEach(name => {
      const adhan = schedule.timings[name];
      document.getElementById(`${name}Adhan`).textContent = format12Hour(adhan);
      document.getElementById(`${name}Iqamah`).textContent = format12Hour(resolveIqamah(name, adhan));
    });
  }

  function renderClockAndPrayerState() {
    const p = zonedParts();
    let hour = Number(p.hour) % 12;
    if (hour === 0) hour = 12;
    document.getElementById("CurrentTime").textContent = `${hour}:${p.minute}`;
    if (!schedule) return;

    const currentMinutes = nowMinutes();
    const prayerMinutes = ORDER.map(name => toMinutes(schedule.timings[name]));
    let latestPrayerIndex = -1;
    prayerMinutes.forEach((value, index) => {
      if (currentMinutes >= value) latestPrayerIndex = index;
    });

    let highlightedIndex = latestPrayerIndex;
    if (latestPrayerIndex === 0) {
      const fajrHighlightEnd = prayerMinutes[0] + Number(CONFIG.fajrHighlightMinutes || 120);
      if (currentMinutes >= fajrHighlightEnd) highlightedIndex = -1;
    }

    ORDER.forEach((name, index) => {
      const row = document.getElementById(name);
      row.classList.toggle("past", index < latestPrayerIndex);
      row.classList.toggle("current", index === highlightedIndex);
    });

    const nextIndex = latestPrayerIndex < 0 ? 0 : (latestPrayerIndex + 1) % ORDER.length;
    let remaining = prayerMinutes[nextIndex] - currentMinutes;
    if (remaining <= 0) remaining += 1440;
    const hours = Math.floor(remaining / 60);
    const minutes = remaining % 60;
    const hourText = hours ? `${hours} hr${hours === 1 ? "" : "s"} ` : "";
    document.getElementById("NextPrayer").textContent = `${hourText}${minutes} mins till ${ORDER[nextIndex]}`;
  }

  async function loadSchedule(force = false) {
    const cached = cacheRead();
    if (cached?.dateKey === dateKey()) {
      schedule = cached;
      activeDateKey = cached.dateKey;
      renderStatic();
      const ageHours = (Date.now() - Number(cached.fetchedAt || 0)) / 3600000;
      setStatus(ageHours > CONFIG.staleWarningHours ? "Using an older cached prayer schedule" : "", ageHours > CONFIG.staleWarningHours);
    }

    if (!force && cached?.dateKey === dateKey() && !shouldFetch()) return;

    try {
      const fresh = await fetchSchedule();
      schedule = fresh;
      activeDateKey = fresh.dateKey;
      cacheWrite(fresh);
      renderStatic();
      setStatus("");
    } catch (error) {
      console.error(error);
      if (schedule) setStatus("Offline · showing cached prayer schedule", true);
      else setStatus("Unable to load prayer schedule · check internet connection", true);
    }
  }

  async function tick() {
    renderClockAndPrayerState();
    const today = dateKey();
    if (activeDateKey && activeDateKey !== today) await loadSchedule(true);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(console.error));
  }

  loadSchedule();
  tick();
  setInterval(tick, 1000);
  setInterval(() => loadSchedule(), 15 * 60 * 1000);
  window.addEventListener("online", () => loadSchedule(true));
})();
