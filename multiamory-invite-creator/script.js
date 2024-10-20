
const { DateTime } = luxon;

function getUTCDateTime(isoDatetime) {
    const datetime = DateTime.fromISO(isoDatetime, { zone: document.getElementById("eventTimezone").value });
    return datetime.toUTC()
}

function generateICSLink(title, start, end, description, location) {
    // Format the .ics content (example - adjust as needed)
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:${title}
BEGIN:VEVENT
DTSTART:${start.toFormat("yyyyMMdd'T'HHmmss'Z'")}
DTEND:${end.toFormat("yyyyMMdd'T'HHmmss'Z'")}
DTSTAMP:${DateTime.now().toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")}
SUMMARY:${title}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`

    return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
}


function generateGCalLink(title, start, end, description, location) {
    const gCalLink = `?action=TEMPLATE&dates=${start.toFormat("yyyyMMdd'T'HHmmss'Z'")}/${end.toFormat("yyyyMMdd'T'HHmmss'Z'")}&details=${description}&location=${location}&text=${title}`
    return `https://calendar.google.com/calendar/render${encodeURI(gCalLink)}`
}


function generateYahooLink(title, start, end, description, location) {
    const yahooLink = `?desc=${description}&dur=false&et=${end.toFormat("yyyyMMdd'T'HHmmss'Z'")}&in_loc=${location}&st=${start.toFormat("yyyyMMdd'T'HHmmss'Z'")}&title=${title}&v=60`
    return `https://calendar.yahoo.com/${encodeURI(yahooLink)}`
}


async function generateLinks() {
    if (!document.getElementById("eventStart").value || !document.getElementById("eventEnd").value) {
        return
    }

    const eventStart = getUTCDateTime(document.getElementById("eventStart").value);
    const eventEnd = getUTCDateTime(document.getElementById("eventEnd").value);
    const eventTitle = `Multiamory ${eventStart.toFormat("LLL")} Video Processing Group`;
    const eventDescription = `The group will be closed fifteen minutes after our start time.  If you need to show up late, just be sure to discuss the details with us beforehand so we know to let you in.

If you have any accessibility needs, such as auto captions, please let us know as soon as possible.

One of the Multiamory hosts will be leading a small group in discussion. Participants are encouraged to bring a topic relevant to their personal lives or current struggles that they would find value in discussing with a group of like-minded, supportive individuals. However, you’re not required to bring something to share - it’s incredibly valuable just to have more folks there to offer their presence and a listening ear.

Out of respect for everyone's privacy and confidentiality, you may not bring any guests, unless they have their own Supercast subscription to Multiamory`;
    const eventLocation = document.getElementById("eventLocation").value;

    heading = document.getElementById('invite-heading');
    heading.textContent = `${eventStart.toFormat("LLLL")} Processing and Peer Support Group`;

    firstPara = document.getElementById('invite-para');
    firstPara.innerHTML = `We hope you can join us for this month's video call!<br><br>
Here is the start time, displayed in various timezones. There are also links at the bottom which will create calendar invites for you to add to your calendar.<br><br>
${eventStart.setZone('America/Los_Angeles').toFormat("ffff")}<br>
${eventStart.setZone('America/New_York').toFormat("ffff")}<br>
${eventStart.setZone('Europe/London').toFormat("ffff")}<br>
${eventStart.setZone('Australia/Sydney').toFormat("ffff")}<br>
`;

    zoomLink = document.getElementById('invite-zoom');
    if (eventLocation) {
        zoomLink.href = eventLocation;
        zoomLink.textContent = `Zoom Meeting Link: ${eventLocation}`;
    }

    gCalLink = document.getElementById('invite-google');
    gCalLink.href = generateGCalLink(eventTitle, eventStart, eventEnd, eventDescription, eventLocation);

    yahooLink = document.getElementById('invite-yahoo');
    yahooLink.href = generateYahooLink(eventTitle, eventStart, eventEnd, eventDescription, eventLocation);

    icsLink = document.getElementById('invite-ics');
    icsLink.href = generateICSLink(eventTitle, eventStart, eventEnd, eventDescription, eventLocation);
    icsLink.download = `${eventStart.toFormat("LLLL")}-ma-event.ics`;
}


async function loadTimezones() {
    try {
        const response = await fetch('tzdb/raw-time-zones.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const timezones = await response.json();
        return timezones;
    } catch (error) {
        console.error("Could not load timezones:", error);
        return [];
    }
}

async function populateTimezones() {
    const select = document.getElementById('eventTimezone');
    const timezones = await loadTimezones();

    timezones.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz.name;
        option.textContent = `${tz.rawFormat}`;
        select.appendChild(option);
    });

    const userTimezone = DateTime.local().zoneName;
    const option = Array.from(select.options).find(option => option.value === userTimezone);
    if (option) {
        option.selected = true;
    }
}

function updateEventEnd() {
    const eventStartInput = document.getElementById("eventStart");
    const eventEndInput = document.getElementById("eventEnd");

    if (eventStartInput.value) {
        const startDateTime = DateTime.fromISO(eventStartInput.value);
        const endDateTime = startDateTime.plus({ minutes: 90 });
        eventEndInput.value = endDateTime.toFormat("yyyy-MM-dd'T'HH:mm");
        getUTCDateTime(eventStartInput.value)
    }
}

async function initialSetup() {
    await populateTimezones();
    const event = DateTime.now().plus({ months: 1 });
    const eventStartInput = document.getElementById("eventStart")
    eventStartInput.value = event.toFormat("yyyy-MM-dd'T12:00'")
    updateEventEnd();
    generateLinks();
}

// Add event listener to eventStart input
document.addEventListener('DOMContentLoaded', function () {
    initialSetup();
    const eventStartInput = document.getElementById("eventStart");
    eventStartInput.addEventListener('change', updateEventEnd);
    eventStartInput.addEventListener('change', generateLinks);
    document.getElementById("eventTimezone").addEventListener('change', generateLinks);
    document.getElementById("eventEnd").addEventListener('change', generateLinks);
    document.getElementById("eventLocation").addEventListener('change', generateLinks);
});
