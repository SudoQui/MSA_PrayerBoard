//Global Variables
const prayerTimes = {};
const islamicDate = ""

//Get Current Time and Date
const date = new Date();
let day = date.getDate()
let monthInt = date.getMonth() + 1
let year = date.getFullYear()

let currentTime = `${date.getHours()}:${date.getMinutes()}`
let clockTime = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
console.log("Time:" +currentTime)

//To turn the time into 12 hour times
const convert12HrTime = time => {
    const [hourStr, minute] = time.split(":");
    let hoursInt = parseInt(hourStr)
    if (hoursInt> 12){
        hoursInt = hoursInt - 12
    }
    return `${hoursInt}:${minute}`
}


//Get Islamic Data from API
const todaysDate = `${day}-${monthInt}-${year}`; 
const address = "11 Kirinari St, Bruce ACT 2617"

const baseURL = "https://api.aladhan.com/v1";
const endPoint = "/timingsByAddress/";
const utc = "Australia/Sydney"
const method = 3;
const shafaq = "general";
const school = 0;


const URL = `${baseURL}${endPoint}${todaysDate}?address=${encodeURIComponent(address)}&timezonestring=${utc}&method=${method}`

const getIslamicData = async () => {
    try {
        const res = await fetch(URL)
        let islamicData = await res.json();
        //Prayer times
        prayerTimes.Fajr = islamicData.data.timings.Fajr
        prayerTimes.Dhuhr = islamicData.data.timings.Dhuhr
        prayerTimes.Asr = islamicData.data.timings.Asr
        prayerTimes.Maghrib = islamicData.data.timings.Maghrib
        prayerTimes.Isha = islamicData.data.timings.Isha

        //Islamic Date
        const islamicDay = islamicData.data.date.hijri.day
        const islamicMoth = islamicData.data.date.hijri.month.en
    

        //console.log("Islamic Month: "+ islamicMoth)
    }
    catch(e){
        console.log(e)
    }
}



//To get the data outside the block, and actually cook with it
(async () => {
    await getIslamicData();
    console.log("Fajr " + prayerTimes.Fajr + 15);
    console.log("Asr: "+prayerTimes.Asr)
    console.log("Mahgrib " +prayerTimes.Maghrib);
    console.log("Isha " +prayerTimes.Isha);


    //determine the next prayer
    const nextPrayer = Object.keys(prayerTimes).find(key => {
    const [pHour, pMin] = prayerTimes[key].split(':').map(Number);
    const [cHour, cMin] = currentTime.split(':').map(Number);

    const prayerDate = new Date();
    prayerDate.setHours(pHour, pMin, 0, 0);

    const currentDate = new Date();
    currentDate.setHours(cHour, cMin, 0, 0);

    return prayerDate > currentDate;
});

if (nextPrayer) {
    const [pHour, pMin] = prayerTimes[nextPrayer].split(':').map(Number);
    const [cHour, cMin] = currentTime.split(':').map(Number);

    let hourDiff = pHour - cHour;
    let minDiff = pMin - cMin;

    if (minDiff < 0) {
        minDiff += 60;
        hourDiff -= 1;
    }

    console.log(`${hourDiff} hrs ${minDiff} mins till ${nextPrayer}`);
} else {
    console.log("No upcoming prayer found."); //We need to fix this to get fajr time next day
}

    

    

})();

       // console.log(JSON.stringify(islamicData, null, 2)); //Tester
