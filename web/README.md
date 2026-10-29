# Med_Track

A beginner-friendly medicine reminder and tracking app built with HTML, CSS, and vanilla JavaScript. It works locally in a modern browser and saves medicines and dose records in that browser's LocalStorage.

## Run it

Open `index.html` directly, or open this folder in VS Code and use Live Server. No build step or server-side code is required.

## Features

- Dashboard with medicine totals, today's doses, taken count, remaining count, and progress.
- Add and edit medicine details, custom health conditions, frequencies, and dose times.
- Medicine list organized by health condition, with confirmation before deletion.
- Date-based schedule with Taken and Skipped actions. Each medicine/date/time combination can only be recorded once.
- Medication history filtered by date. Deleting a medicine keeps its historical records.
- Responsive sidebar navigation for desktop and mobile.
- A small demonstration set is created the first time the app opens. Use **Clear sample data** on the My medicines page to remove only the sample medicines and their dose records; medicines you added remain.

## Data and privacy

All data stays in the browser's LocalStorage for this origin. Clearing browser site data or using a different browser/device removes or separates the data. The app does not send medicine details to a server and does not implement browser notifications.

## Project layout

```text
index.html
css/style.css
js/app.js
js/storage.js
js/medicines.js
assets/icons/
```


