const { DateTime } = luxon;

function getUTCDateTime(isoDatetime) {
  const datetime = DateTime.fromISO(isoDatetime, {
    zone: document.getElementById("eventTimezone").value,
  });
  return datetime.toUTC();
}

function generateICSLink(title, start, end, description, location) {
  const searchParams = new URLSearchParams();
  searchParams.append("title", title);
  searchParams.append("start", start.toFormat("yyyyMMdd'T'HHmmss'Z'"));
  searchParams.append("end", end.toFormat("yyyyMMdd'T'HHmmss'Z'"));
  searchParams.append(
    "timestamp",
    DateTime.now().toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")
  );
  searchParams.append("description", description.replace(/\n/g, "\\n"));
  searchParams.append("location", location);

  return `https://jase.town/multiamory-invite-creator/ics-link.html?${searchParams.toString()}`;
}

function generateGCalLink(title, start, end, description, location) {
  const gCalLink = `?action=TEMPLATE&dates=${start.toFormat(
    "yyyyMMdd'T'HHmmss'Z'"
  )}/${end.toFormat(
    "yyyyMMdd'T'HHmmss'Z'"
  )}&details=${description}&location=${location}&text=${title}`;
  return `https://calendar.google.com/calendar/render${encodeURI(gCalLink)}`;
}

function generateYahooLink(title, start, end, description, location) {
  const yahooLink = `?desc=${description}&dur=false&et=${end.toFormat(
    "yyyyMMdd'T'HHmmss'Z'"
  )}&in_loc=${location}&st=${start.toFormat(
    "yyyyMMdd'T'HHmmss'Z'"
  )}&title=${title}&v=60`;
  return `https://calendar.yahoo.com/${encodeURI(yahooLink)}`;
}

async function generateInvite() {
  if (
    !document.getElementById("eventStart").value ||
    !document.getElementById("eventEnd").value
  ) {
    return;
  }

  const eventStart = getUTCDateTime(
    document.getElementById("eventStart").value
  );
  const eventEnd = getUTCDateTime(document.getElementById("eventEnd").value);
  const eventTitle = `Multiamory ${eventStart.toFormat(
    "LLL"
  )} Video Processing Group`;
  const eventDescription =
    "The group will be closed fifteen minutes after our start time.";
  const eventLocation = document.getElementById("eventLocation").value;

  heading = document.getElementById("invite-heading");
  heading.textContent = `${eventStart.toFormat(
    "LLLL"
  )} Processing and Peer Support Group`;

  firstPara = document.getElementById("invite-para");
  firstPara.innerHTML = `We hope you can join us for this month's video call!<br><br>Here is the start time, displayed in various time zones. There are also links at the bottom which will create calendar invites for you to add to your calendar.<br><br>`;

  datetimePara = document.getElementById("datetime-local");
  datetimePara.innerHTML = datetimePara.innerHTML = `${eventStart
    .setZone("America/Los_Angeles")
    .toFormat("ffff")}<br>
${eventStart.setZone("America/New_York").toFormat("ffff")}<br>
${eventStart.setZone("Europe/London").toFormat("ffff")}<br>
${eventStart.setZone("Australia/Sydney").toFormat("ffff")}<br>
`;

  datetimeDiscord = document.getElementById("datetime-discord");
  datetimeDiscord.innerHTML = datetimeDiscord.innerHTML.replace(
    "[DatetimeHere]",
    `&lt;t:${eventStart.toUTC().toSeconds()}:F&gt;`
  );

  zoomLink = document.getElementById("invite-zoom");
  if (eventLocation) {
    zoomLink.href = eventLocation;
    zoomLink.textContent = `Zoom Meeting Link: ${eventLocation}`;
  }

  gCalLink = document.getElementById("invite-google");
  gCalLink.href = generateGCalLink(
    eventTitle,
    eventStart,
    eventEnd,
    eventDescription,
    eventLocation
  );

  yahooLink = document.getElementById("invite-yahoo");
  yahooLink.href = generateYahooLink(
    eventTitle,
    eventStart,
    eventEnd,
    eventDescription,
    eventLocation
  );

  icsLink = document.getElementById("invite-ics");
  icsLink.href = generateICSLink(
    eventTitle,
    eventStart,
    eventEnd,
    eventDescription,
    eventLocation
  );
}

async function loadTimezones() {
  try {
    const response = await fetch("tzdb/raw-time-zones.json");
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
  const select = document.getElementById("eventTimezone");
  const timezones = await loadTimezones();

  timezones.forEach((tz) => {
    const option = document.createElement("option");
    option.value = tz.name;
    option.textContent = `${tz.rawFormat}`;
    select.appendChild(option);
  });

  const userTimezone = DateTime.local().zoneName;
  const option = Array.from(select.options).find(
    (option) => option.value === userTimezone
  );
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
    getUTCDateTime(eventStartInput.value);
  }
}

async function initialSetup() {
  await populateTimezones();
  const event = DateTime.now().plus({ months: 1 });
  const eventStartInput = document.getElementById("eventStart");
  eventStartInput.value = event.toFormat("yyyy-MM-dd'T12:00'");
  updateEventEnd();
  generateInvite();
}

// Copy functionality
function cleanText(text) {
  // Remove extra spaces at the beginning of lines and ensure single line breaks between paragraphs
  return text.replace(/^\s+/gm, "").replace(/\n\s*\n\s*\n+/g, "\n\n");
}

function showCopyFeedback(message) {
  // Create a temporary feedback element
  const feedback = document.createElement("div");
  feedback.textContent = message;
  feedback.style.cssText =
    "position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px; border-radius: 4px; z-index: 1000;";
  document.body.appendChild(feedback);

  setTimeout(() => {
    document.body.removeChild(feedback);
  }, 2000);
}

function copyAsRichText() {
  const outputDiv = document.getElementById("output");

  // Clone the output div to avoid modifying the original
  const clonedDiv = outputDiv.cloneNode(true);

  // Remove the hidden datetime-discord element
  const datetimeDiscord = clonedDiv.querySelector("#datetime-discord");
  if (datetimeDiscord) {
    datetimeDiscord.remove();
  }

  const htmlContent = `
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body>
        ${clonedDiv.innerHTML}
      </body>
    </html>
  `.replace(/(?<=<\/p>)[\s]*<br>[\s]*(?=<p>)/g, "");

  const plainTextContent = cleanText(clonedDiv.textContent);

  const clipboardItem = new ClipboardItem({
    "text/html": new Blob([htmlContent], { type: "text/html" }),
    "text/plain": new Blob([plainTextContent], { type: "text/plain" }),
  });

  navigator.clipboard
    .write([clipboardItem])
    .then(() => {
      showCopyFeedback("Rich text copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy rich text:", err);
      // Fallback to plain text if rich text fails
      navigator.clipboard
        .writeText(plainTextContent)
        .then(() => {
          showCopyFeedback(
            "Text copied to clipboard (rich text not supported)!"
          );
        })
        .catch(() => {
          showCopyFeedback("Failed to copy content");
        });
    });
}

function copyAsMarkdown() {
  const outputDiv = document.getElementById("output");
  let markdown = "";

  // Convert HTML to markdown
  const elements = outputDiv.children;
  for (let element of elements) {
    if (element.tagName === "H2") {
      markdown += `## ${element.textContent}\n\n`;
    } else if (element.tagName === "H3") {
      markdown += `### ${element.textContent}\n\n`;
    } else if (element.id == "datetime-local") {
      continue;
    } else if (element.id == "datetime-discord") {
      const dt = element.innerText
        .trim()
        .replace("&lt;", "\\<")
        .replace("&gt;", ">");
      markdown += `${dt}\n\n`;
    } else if (element.tagName === "P") {
      const text = element.innerHTML
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "");
      markdown += `${text.trim()}\n\n`;
    } else if (element.tagName === "UL") {
      const listItems = element.querySelectorAll("li");
      listItems.forEach((li) => {
        const text = li.textContent
          .trim()
          .replaceAll("\n", "")
          .replace(/ +/g, " ");
        markdown += `  • ${text}\n`;
      });
      markdown += "\n";
    } else if (element.tagName === "STRONG") {
      const links = element.querySelectorAll("a");
      links.forEach((link) => {
        if (link.href && link.textContent) {
          markdown += `**[${link.textContent}](${link.href})**\n\n`;
        }
      });
    }
  }

  navigator.clipboard
    .writeText(markdown)
    .then(() => {
      showCopyFeedback("Markdown copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy markdown:", err);
      showCopyFeedback("Failed to copy markdown");
    });
}

// Add event listener to eventStart input
document.addEventListener("DOMContentLoaded", function () {
  initialSetup();
  const eventStartInput = document.getElementById("eventStart");
  eventStartInput.addEventListener("change", updateEventEnd);
  eventStartInput.addEventListener("change", generateInvite);
  document
    .getElementById("eventTimezone")
    .addEventListener("change", generateInvite);
  document
    .getElementById("eventEnd")
    .addEventListener("change", generateInvite);
  document
    .getElementById("eventLocation")
    .addEventListener("change", generateInvite);

  // Add event listeners for copy buttons
  document
    .getElementById("copy-rich-text")
    .addEventListener("click", copyAsRichText);
  document
    .getElementById("copy-markdown")
    .addEventListener("click", copyAsMarkdown);
});
