<div align="center">

<img src="./components/assets/img/icons/join-request.svg" height="96" alt="Join logo" />

# Join – Issue Collector

</div>

<div align="center">

![Learning project](https://img.shields.io/badge/Learning_Project-Frontend-4589FF?style=for-the-badge)
![Project status](https://img.shields.io/badge/Status-ready_for_review-1268FF?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=for-the-badge)

</div>

<div align="center">

<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" height="40" alt="HTML5 logo" />
<img width="12" />
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" height="40" alt="CSS3 logo" />
<img width="12" />
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" height="40" alt="JavaScript logo" />
<img width="12" />
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-original.svg" height="40" alt="Firebase logo" />

</div>

<div align="center">

Join is a responsive Kanban project management application for organizing tasks,
tracking progress and collaborating through a shared Firebase data store.
It provides authenticated and guest access to the same board, contacts and task workflow.
The Issue Collector extends Join with a public request form and an n8n pipeline
that turns incoming emails into validated, AI-assisted tickets in Triage.

</div>

## Live Demo

[Open Join – Issue Collector](https://join-n8n-andre-2026.web.app/)

[Project repository](https://github.com/andrewojak1618-debug/Join-with-n8n-implem.)

## Preview

![Current Join Summary with blue header, white sidebar and Email Requests tile](./components/assets/img/join-summary-preview.jpg)

## Table of Contents

- [Features](#features)
- [Issue Collector](#issue-collector)
- [Workflow screenshots](#workflow-screenshots)
- [Tech Stack](#tech-stack)
- [Application Architecture](#application-architecture)
- [Requirements](#requirements)
- [Quickstart](#quickstart)
- [Firebase Setup](#firebase-setup)
- [n8n Setup](#n8n-setup)
- [Ollama Setup](#ollama-setup)
- [Usage](#usage)
- [Demo Walkthrough](#demo-walkthrough)
- [Project Structure](#project-structure)
- [Automated Tests](#automated-tests)
- [Deployment](#deployment)

## Features

| Feature           | Description                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Authentication    | Sign up and sign in with Firebase Authentication.                                             |
| Guest access      | Test the application anonymously while using the shared task and contact data.                |
| Summary           | View task totals, status metrics, deadlines and Email Requests (all tickets with source=email).           |
| Add Task          | Create tasks with a title, description, due date, priority, category, assignees and subtasks. |
| Board             | Organize tasks across Triage, To do, In progress, Await feedback and Done.                            |
| Task editing      | Edit, move and delete existing tasks directly from the board.                                 |
| Subtasks          | Add, edit, remove and complete individual subtasks.                                           |
| Search            | Filter board cards by task title or description.                                              |
| Contacts          | Create, edit and delete contacts and display the signed-in user in the contact list.          |
| Shared data       | Store tasks and contacts centrally in Cloud Firestore.                                        |
| Legal pages       | Switch legal content between English and German while preserving the selected language.       |
| Responsive design | Use the application on desktop, tablet and mobile layouts.                                    |

## Issue Collector

- **Public request flow:** Welcome leads to the stakeholder landing page and
  Your Request. Send request opens an email draft containing recipient, subject
  and the full message. The visitor sends that draft in their email application.
- **Email processing:** n8n reads the collector Gmail inbox, excludes own replies,
  automatic replies and delivery failures before reservation, and extracts readable
  text, including from HTML-only messages.
- **AI classification:** Ollama with `qwen3:4b-instruct` extracts title,
  description, issue type, priority and deadline candidates. Validated results
  map to the board categories User Story and Technical Task. Missing or
  contradictory deadlines remain unset rather than being invented.
- **Triage:** New automatically generated tickets start in Triage. The dialog
  shows the original external creator and an AI indicator. Manual tickets also
  support Triage; internal creators and guests are displayed separately.
- **Global daily quota:** At most ten automatic tickets per day, with the day
  changing at midnight in `Europe/Berlin`. Reservations count toward the quota;
  the landing page displays the current usage and switches to the limit view
  when all ten places are used. Further requests remain available for manual work.
- **Duplicate protection and errors:** A stable mail identity prevents repeated
  processing from creating a second ticket. Failed processing releases its
  reserved place; retries are bounded. Error and limit paths send feedback
  without a ticket ID and label the mail for manual processing (`zu bearbeiten`).
- **Successful processing:** The sender receives a confirmation with the ticket
  ID. The source mail receives `erledigt` and leaves the inbox. Separate delivery
  and filing states allow retrying those steps without creating another ticket.
- **Status notifications:** Saved board status changes produce events with a
  unique ID, ticket ID, old/new status and original creator. n8n uses those events
  to send status messages; guests without an address are skipped.

The hosted frontend does not run n8n or Ollama. Automatic ticket creation and
notifications require the configured workflows and services to be running.
The existing collector export is in `n8n/issue-collector-workflow.json`.
The structural workflow imports, isolated status delivery checks and the live
success-path demo on 2026-11-22 have passed. The demo used the existing installation
and connected credentials. Restart verification and a live insufficient-content
check also passed in that installation, as detailed below. A complete fresh-install
run remains open under C-18; this is not yet a verified end-to-end installation guide.

### Workflow screenshots

The overview shows the complete 89-node Collector editor layout. Expand a stage
below for readable detail views; select an image to open it at its original size.
Connections leaving a detail view continue in the overview or an adjacent stage.
The disconnected diagnostic nodes at the top left are separate from the intake path.
Captured on 2026-11-21; these editor views document the structure, not a test execution.
The separate board-status notification workflow is not shown here.

[![Complete Issue Collector workflow](./components/assets/img/collector/collector-overview.jpg)](./components/assets/img/collector/collector-overview.jpg)

<details>
<summary>1. Mail intake, reservation and daily quota</summary>

**Gmail intake, automatic-mail filtering and stable mail identity**

[![Gmail intake, automatic-mail filtering and stable mail identity](./components/assets/img/collector/collector-01-mail-intake.jpg)](./components/assets/img/collector/collector-01-mail-intake.jpg)

**Existing mail reservations and retry eligibility**

[![Existing mail reservations and retry eligibility](./components/assets/img/collector/collector-02-mail-reservation.jpg)](./components/assets/img/collector/collector-02-mail-reservation.jpg)

**Reading and initializing the daily counter**

[![Reading and initializing the daily counter](./components/assets/img/collector/collector-03-daily-counter.jpg)](./components/assets/img/collector/collector-03-daily-counter.jpg)

**Checking the quota and reserving one daily place**

[![Checking the quota and reserving one daily place](./components/assets/img/collector/collector-04-quota-reservation.jpg)](./components/assets/img/collector/collector-04-quota-reservation.jpg)

**Reading the counter again after a version conflict**

[![Reading the counter again after a version conflict](./components/assets/img/collector/collector-05-reservation-retry.jpg)](./components/assets/img/collector/collector-05-reservation-retry.jpg)

</details>

<details>
<summary>2. AI extraction, validation and ticket storage</summary>

**Ollama extraction with the structured output parser**

[![Ollama extraction with the structured output parser](./components/assets/img/collector/collector-06-ai-extraction.jpg)](./components/assets/img/collector/collector-06-ai-extraction.jpg)

**Validating ticket data and saving the ticket with the daily counter**

[![Validating ticket data and saving the ticket with the daily counter](./components/assets/img/collector/collector-07-validation-storage.jpg)](./components/assets/img/collector/collector-07-validation-storage.jpg)

</details>

<details>
<summary>3. Failure handling and reservation release</summary>

**Shared release preparation for AI and validation failures**

[![Shared release preparation for AI and validation failures](./components/assets/img/collector/collector-08-release-preparation.jpg)](./components/assets/img/collector/collector-08-release-preparation.jpg)

**Separate failure states, manual-review labels and label-error storage**

[![Separate failure states, manual-review labels and label-error storage](./components/assets/img/collector/collector-09-processing-errors.jpg)](./components/assets/img/collector/collector-09-processing-errors.jpg)

**Storage failure handling and daily-place release**

[![Storage failure handling and daily-place release](./components/assets/img/collector/collector-10-storage-error.jpg)](./components/assets/img/collector/collector-10-storage-error.jpg)

</details>

<details>
<summary>4. Daily-limit response and manual review</summary>

**Preparing and sending the daily-limit response**

[![Preparing and sending the daily-limit response](./components/assets/img/collector/collector-11-limit-response.jpg)](./components/assets/img/collector/collector-11-limit-response.jpg)

**Recording delivery state and labeling the mail for manual review**

[![Recording delivery state and labeling the mail for manual review](./components/assets/img/collector/collector-12-limit-filing.jpg)](./components/assets/img/collector/collector-12-limit-filing.jpg)

</details>

<details>
<summary>5. Confirmation and successful filing</summary>

**Checking delivery state before preparing the confirmation**

[![Checking delivery state before preparing the confirmation](./components/assets/img/collector/collector-13-confirmation-preparation.jpg)](./components/assets/img/collector/collector-13-confirmation-preparation.jpg)

**Recording confirmation success or a delivery error**

[![Recording confirmation success or a delivery error](./components/assets/img/collector/collector-14-confirmation-result.jpg)](./components/assets/img/collector/collector-14-confirmation-result.jpg)

**Applying the completed label, archiving the source mail and recording filing errors**

[![Applying the completed label, archiving the source mail and recording filing errors](./components/assets/img/collector/collector-15-successful-filing.jpg)](./components/assets/img/collector/collector-15-successful-filing.jpg)

</details>

<details>
<summary>6. Feedback for manual processing</summary>

**Checking and reserving the manual-feedback delivery**

[![Checking and reserving the manual-feedback delivery](./components/assets/img/collector/collector-16-manual-feedback.jpg)](./components/assets/img/collector/collector-16-manual-feedback.jpg)

**Sending manual feedback and recording its result**

[![Sending manual feedback and recording its result](./components/assets/img/collector/collector-17-feedback-result.jpg)](./components/assets/img/collector/collector-17-feedback-result.jpg)

</details>

## Tech Stack

| Technology              | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| HTML5                   | Semantic page and component structure                          |
| CSS3                    | Responsive layouts, Figma-based styling and interaction states |
| JavaScript ES6+         | Routing, rendering, validation and application logic           |
| Firebase Authentication | Email/password and anonymous guest authentication              |
| Cloud Firestore         | Shared task and contact persistence                            |
| Firebase Hosting        | Public deployment of the application                           |
| n8n and Gmail           | Email intake, processing, confirmations and status notifications |
| Ollama                  | Local AI classification with qwen3:4b-instruct                  |
| Node.js test runner     | Automated tests for central application logic                  |

## Application Architecture

Join uses a multi-page architecture. The HTML files in the project root are
small route entry documents. `main.js` loads the matching page component and,
for protected pages, the shared application layout.

Visible markup is organized according to Atomic Design:

- `atoms` contain the smallest reusable UI elements.
- `molecules` combine atoms into focused controls.
- `organisms` provide larger reusable interface sections.
- `pages` contain route-specific content.
- `templates` provide shared page layouts.

The JavaScript layer separates rendering, validation, stores, Firebase adapters
and feature-specific interactions into focused files.

## Requirements

- Current browser, Git, Node.js LTS and npm; VS Code Live Server for the frontend.
- Windows with Docker Desktop's WSL2/Linux-container backend for the documented
  n8n setup. Start Docker Desktop and wait for its engine before Docker commands.
- Ollama for Windows and sufficient RAM/disk space to load `qwen3:4b-instruct`.
  A compatible GPU improves inference speed; verify a real model response locally.
- Internet access for Firebase, Google OAuth/Gmail, images and model downloads.
- Authorized access to Firebase project `join-n8n-andre-2026`, a registered Web app,
  Firestore `(default)` database, and Google Cloud API/OAuth configuration.
- A dedicated Gmail collector account and a separate sender for end-to-end tests.
  An email application or browser mail handler is required for the request draft.

The hosted frontend needs no local installation. Email automation additionally
needs running n8n/Ollama services and connected credentials. Versions of n8n,
Docker and Ollama must be recorded during the pending fresh-install test; no
tested version matrix is claimed here.

### Installation scope and required inputs

A frontend checkout, email intake and status notifications are separate setup stages.
Prepare the following before starting; a clone alone does not configure cloud accounts.

| Required input | Where it comes from |
| --- | --- |
| Target project and Web app settings | Firebase Console; use a separate project for an independent installation. |
| Firestore `(default)`, rules and indexes | Target project plus the repository configuration; enable sign-in providers in Console. |
| Collector address and sender test account | Two accessible mailboxes; the sender must be able to receive replies. |
| OAuth client and allowed accounts | Google Cloud project with Gmail/Firestore APIs, consent settings and redirect URI. |
| Gmail label IDs | The target collector account; label IDs cannot be copied between accounts. |
| Ollama endpoint and model | Host API reachable from the n8n container, with `qwen3:4b-instruct` installed. |
| Mail handler | A configured browser/OS handler for `mailto:`; Gmail sign-in alone is insufficient. |

Before starting containers, run `docker version` and `docker compose version`.
The Docker server must respond, and Compose must support `docker compose` commands.
Check that ports 5500 (frontend), 5678 (n8n) and 11434 (Ollama) are available,
or identify the existing service using them. Do not start a competing n8n listener.
There is no frontend compilation or npm install step. Hosting uses the Node.js
packaging command described under Deployment.

### Setup order and remaining installation gaps

1. Clone the repository and record `git rev-parse HEAD` for the version being installed.
2. Configure the target Firebase project and local Web configuration; verify login,
   guest access, and tasks/contacts through Live Server.
3. Install Ollama, pull the model and verify one response before importing the workflow.
4. Start the isolated n8n installation, connect credentials and replace workflow placeholders.
5. Run the intake acceptance checks below with one unique test mail.
6. Import and verify the separate status-notification workflow.
7. Configure Hosting separately if a public deployment is required.

The following are still required before claiming a complete, reproducible installation:

- A combined installation test with newly connected credentials,
  automatic polling and restart verification. The structural imports of both the Collector
  and the separate status workflow have passed.
- A recorded fresh-install run with commit, service versions, model identity and results
  for intake, confirmation, filing, duplicate prevention and status delivery after restart.

These gaps do not prevent a local frontend setup. They do prevent treating the
current repository as a complete deployment package. Track completion on C-18.

## Quickstart

```powershell
git clone https://github.com/andrewojak1618-debug/Join-with-n8n-implem..git Join
cd Join
node --version
npm --version
```

Complete Firebase Setup below. Open `index.html` with VS Code **Live Server** and
use `http://127.0.0.1:5500/index.html` (adjust the port if Live Server selects another).
Do not open through `file://`. If Python is installed, an alternative is
`python -m http.server 5500 --bind 127.0.0.1`; Python is not otherwise required.
For automatic emails, continue with n8n Setup and Ollama Setup.

## Firebase Setup

Use the existing project for authorized team work. For an independent test project,
use its own IDs and accounts throughout; do not point isolated tests at live data.

1. In Firebase Console, select the project and verify Authentication has
   **Email/Password** and **Anonymous** sign-in enabled. Add the actual development
   hosts (`localhost` and/or `127.0.0.1`) to Authorized domains without port or scheme.
2. Verify the `(default)` Cloud Firestore database exists. The repository config
   specifies `europe-west3`. Use the checked-in `firestore.rules` and
   `firestore.indexes.json`; do not replace them with open test-mode rules.
3. In Project settings > General, select the registered Web app and copy its
   Firebase SDK configuration into the local template below. These Web settings
   are distinct from n8n's Google OAuth client ID and secret.

```powershell
# Only on a new checkout; preserve an existing local configuration.
Copy-Item components/js/firebase/firebaseConfig.example.js components/js/firebase/firebaseConfig.js
```

Replace the template values for `apiKey`, `authDomain`, `projectId` and `appId`,
retaining `window.joinFirebaseConfig = { ... };`. This project keeps that file
Git-ignored. Never add OAuth secrets, service-account keys or passwords to it.

```powershell
node --check components/js/firebase/firebaseConfig.js
git check-ignore components/js/firebase/firebaseConfig.js
npx -y firebase-tools@latest --version
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use join-n8n-andre-2026
```

An authorized maintainer can deploy the reviewed rules/indexes with
`npx -y firebase-tools@latest deploy --only firestore --project join-n8n-andre-2026`.
This changes the shared backend; it is not required for every frontend checkout.
The Hosting section in `firebase.json` publishes only `hosting-dist`, generated
from an explicit file list. Follow Deployment below after preparing the local Web
configuration. The existing Firestore section and multi-page routes are preserved;
there is no blanket rewrite to `index.html`.

The landing-page endpoint in `components/js/stakeholder.js` also contains the
project ID. Change it along with `.firebaserc` and the Web config for another
project. Keep the day format `YYYY-MM-DD` and time zone `Europe/Berlin` consistent.
The public daily-counter document must contain only dailyLimit, completedCount
and reservedCount; extra fields cause the checked-in read rule to reject access.
Check login, guest access and loading contacts/tasks before testing automation.
Reference: [Firebase Web setup](https://firebase.google.com/docs/web/setup).

## n8n Setup

### Existing local installation

Start Docker Desktop first, then inspect and start the existing container:

```powershell
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
docker start n8n
docker logs --tail 50 n8n
```

Open `http://localhost:5678`. If `n8n` does not exist, use the fresh-install steps.
Do not recreate or delete an existing container/volume to fix an OAuth error.

### Fresh local installation with Docker Compose

Use this only for a new installation, not to migrate the existing `n8n` container.
The running project installation reported n8n `2.45.4` on 2026-11-21. The example
pins that version; the status-workflow import passed on it, while the complete setup remains unverified.
Do not silently replace it with `latest`. Record any deliberately chosen version.

From the repository root, create the ignored local configuration directory:

```powershell
New-Item -ItemType Directory -Force n8n/local
```

Save this as `n8n/local/compose.yaml`. It is a minimal local setup for this project,
not the additional Assistant/sandbox stack described in the broader vendor guide.

```yaml
name: join-collector-local
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:2.45.4
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"
    environment:
      GENERIC_TIMEZONE: Europe/Berlin
      TZ: Europe/Berlin
      N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: "true"
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data:
```

With no other service listening on port 5678, run from the repository root:

```powershell
docker compose -f n8n/local/compose.yaml config --quiet
docker compose -f n8n/local/compose.yaml pull
docker compose -f n8n/local/compose.yaml up -d
docker compose -f n8n/local/compose.yaml ps
docker compose -f n8n/local/compose.yaml logs --tail 50 n8n
docker compose -f n8n/local/compose.yaml exec n8n n8n --version
```

Open `http://localhost:5678` and create the local owner account. For this Compose
installation, use `docker compose -f n8n/local/compose.yaml stop` and `up -d` to
stop/start it; `docker start n8n` applies only to the separately named legacy container.
The project-prefixed volume keeps workflow data, credentials and encryption-key state.
Back it up together before upgrades; do not use `down -v`, which removes the data volume.

See [n8n Docker Compose documentation](https://docs.n8n.io/deploy/host-n8n/install-options/install-using-docker-compose.md).
This README example has not yet been used for a complete fresh-install acceptance run.

### Google credentials and workflow import

1. Enable Gmail API and Cloud Firestore API in the relevant Google Cloud project.
   Configure the OAuth consent screen and add the connecting accounts as test
   users when the app is in Testing mode. Create a Web application OAuth client.
2. In n8n create **Gmail OAuth2 API** and **Google Firebase Cloud Firestore OAuth2
   API** credentials. Register the exact redirect URL shown by n8n with the OAuth
   client (local default: `http://localhost:5678/rest/oauth2-credential/callback`).
   Enter the client ID/secret only in n8n. Connect Gmail as the collector account;
   connect Firestore as an account with authorized database read/write access.
3. Grant the requested service scopes and test both credentials. OAuth Firestore
   access needs appropriate Google Cloud IAM permissions; frontend security rules
   are not a substitute. Do not weaken Firestore rules to repair a token error.
4. Import `n8n/issue-collector-workflow.json` through **Import from File** into an
   inactive workflow. Reassign credentials on every Gmail, Firestore HTTP and
   Ollama node, including failure/retry branches; exports contain no usable secrets.
5. Replace every `YOUR_FIREBASE_PROJECT` with the target project ID. Replace
   `collector@example.com` throughout with the collector address, including the
   Gmail search, own-mail filter and identity expressions. Set the same recipient
   in components/js/email-mask.js when using a different collector.
6. Create Gmail labels `zu bearbeiten` and `erledigt`. Replace each
   `YOUR_REVIEW_LABEL_ID` with the actual ID of `zu bearbeiten`, not its display
   name. Check the workflow's name-based lookup for `erledigt` in the same account.
7. Keep Gmail Trigger's full response (`Simplify` off), one-minute polling and
   `in:inbox -from:YOUR_COLLECTOR_ADDRESS` search. Retain the downstream automatic
   mail filter, global limit 10 and `Europe/Berlin` day calculation.
8. Test connections and a uniquely named mail before publishing/activating the
   workflow. Disable duplicate/test listeners on the same inbox. Automatic polling
   only works while n8n is running and the workflow is published/active.

The separate status workflow is supplied as `n8n/status-notification-workflow.json`.
Configure and import it separately as described below; importing the collector alone
does not install status notifications. See the separate import and delivery results below.
For an external OAuth app in Testing mode, refresh tokens with these service scopes
expire after seven days; reconnecting may therefore be required even if Docker is healthy.
See [Google refresh-token expiration](https://developers.google.com/identity/protocols/oauth2#expiration).
Reference: [Google OAuth setup in n8n](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/).

### Status-notification workflow

Import `n8n/status-notification-workflow.json` as a separate, inactive workflow.
It contains the published 16-node status pipeline exported on 2026-11-21.
Credentials, pinned data, saved polling cursors, workflow ownership/version metadata
and deployment-specific identifiers have been removed. The fresh import and separate
isolated delivery check passed as documented below.

Before activation, configure these values throughout the imported workflow:

| Setting | Required value |
| --- | --- |
| `YOUR_FIREBASE_PROJECT` | The same project as the Board and collector, using database `(default)`. |
| `YOUR_MESSAGE_ID_DOMAIN` | A domain for your installation's Message-ID, such as its Hosting domain, without scheme or path. |
| `YOUR_STATUS_START_UTC` | UTC cutoff in `Neue Statusereignisse`, for example the actual activation time from `(Get-Date).ToUniversalTime().ToString('o')`. Set it before creating the test event. |
| Firestore OAuth2 credential | Assign to the five Firestore HTTP nodes listed below. |
| Gmail OAuth2 credential | Assign to `Statusnachricht senden`; this account sends the notifications. |

The workflow has five Firestore HTTP nodes: `Statusereignisse lesen`,
`Versand reservieren`, `Versand speichern`, `Fehlgeschlagene Zustellungen lesen`
and `Wiederholung reservieren`. Assign the Firestore credential to each of these.
No Ollama credential or Gmail label IDs are needed for this separate workflow.

`Jede Minute` polls once per minute; it is not a webhook. The event query reads
the `statusEvents` collection group created by saved Board status changes.
Each event must include `ticketId`, `oldStatus`, `newStatus` and a creator map
whose `email` identifies the original recipient. Allowed statuses are `triage`,
`todo`, `in-progress`, `feedback` and `done`. Events without a creator address
are skipped. Configure the Board against the same project before testing.

The initial cutoff prevents sending historical events from a previous installation.
The exported cursor is empty; an unchanged placeholder stops processing with an
explicit configuration error. After published runs, n8n stores its event cursor
in workflow static data. Keep the persistent n8n volume across restarts. Do not
reset the cursor or set an old cutoff against shared data merely to test import.

`issue-collector-status-deliveries/{eventId}` stores delivery reservations and
results. Existing reservations suppress a second initial send. `sent` records the
Gmail message ID; `failed` stores error details and the message needed for retry.
The second schedule branch retries `failed` records using an update-time condition
to reserve each retry. The current export has no retry-count limit or backoff;
an ongoing definite failure is retried on subsequent polls. `unconfirmed` results
and outstanding `reserved` records are not automatically resent: inspect Gmail
and execution history before recovery to avoid duplicate mail. A stable Message-ID
alone does not guarantee Gmail deduplication.

Use a separate test project for import checks, including an empty delivery
collection: the retry branch reads failed records independently of the event cutoff.
Activate only one status workflow for the target project. Create and move one test
ticket after the configured cutoff, then verify the event ID, creator address,
ticket ID, one received status mail and the matching `sent` delivery record.
Repeat the same event and restart n8n to verify duplicate protection and persistence.
Automatic polling and status delivery passed in the existing installation on
2026-11-22, as recorded below. Restart persistence also passed in that existing
installation. The full fresh-install acceptance run remains open under C-18.


### Verified status-workflow checks — 2026-11-21

- **Fresh import:** Imported the sanitized 16-node JSON into n8n 2.45.4 with a
  new, separate Docker data volume. A read-back export confirmed the workflow
  was inactive and had no credential bindings. This check did not send mail.
- **Isolated delivery:** Imported a separate test copy into the existing n8n
  installation and assigned its existing Gmail/Firestore connections. Only
  separate test collections for status events and delivery records were used.
  The schedule was replaced by a manual trigger for controlled execution.
- **Result:** A synthetic event for an isolated test ticket changed from `triage`
  to `todo`. Exactly one
  message arrived in the designated test recipient's Gmail inbox, showing that
  ticket ID and the readable status “Offen”. The delivery record was `sent`.
- **Repeat:** Processing the same event again encountered the existing delivery
  reservation (`ALREADY_EXISTS`) and did not send another message. The sender's
  mailbox contained exactly one matching message after the repeat.
- **Production unchanged:** Before/after exports confirmed the regular status
  workflow's version, nodes and connections were unchanged and it remained active.
  The test copy remained inactive after the manual runs.

These are two complementary import/delivery checks, not a full installation
acceptance. The synthetic event did not test a Board interaction. The later live
demo below verified automatic polling and an actual Board change using the
existing installation. The restart check below adds persistence evidence for
that installation; setup with new OAuth connections remains unverified.

### Verified live demo — 2026-11-22

The regular Collector and status-notification workflows were tested in the
existing installation with its connected credentials. Ollama was started before
processing, and n8n could reach the installed `qwen3:4b-instruct` model.

- **Intake and AI:** One new external test email automatically triggered the
  Collector. Exactly one corresponding ticket appeared in the hosted Board's
  Triage column, with the full message, external creator, AI indicator,
  Technical Task category, Medium priority and no invented deadline.
- **Confirmation and filing:** The sender received exactly one confirmation
  containing that ticket's ID. The reservation was `completed`, confirmation
  state `sent` and filing state `filed`. The original email had `erledigt`
  and no `INBOX` label. The daily counter showed one completed place and zero
  reserved places, with a limit of ten.
- **Board change and status mail:** Moving the same ticket once from Triage to
  To do produced one event with its ticket ID, old/new status and original
  creator. Automatic status processing recorded `sent`. The creator received
  exactly one status message with the same ticket ID and readable status “Offen”.
  The recipient mailbox contained two messages for the demo: one confirmation
  and one status notification.
- **Scope:** Regular workflow definitions were unchanged. Technical execution,
  ticket, event and delivery references are recorded on C-18, not in this README.
  This run began with a sent test email; it did not repeat the public form/mail
  handler test or inject an error/limit failure.

### Verified restart — 2026-11-22

The existing n8n 2.45.4 container was restarted with its persistent data volume.
The service became reachable again, both regular workflows remained active,
and the stored trigger/cursor state and connected credentials were retained.

- **Automatic processing:** A new external email started the Collector without
  a manual run. Exactly one Triage ticket, one confirmation with its ticket ID,
  and the expected `erledigt` filing without `INBOX` were verified.
- **Status delivery:** Moving that ticket once from `triage` to `todo` created
  one matching event. Exactly one status message with the correct ticket ID
  and new status arrived in the creator's inbox.
- **Persistence and duplicates:** Previously sent message IDs remained unchanged;
  no extra delivery caused by the restart was observed. This was not a forced
  replay of the same email or event. The isolated repeat test above remains
  a separate duplicate-prevention check.
- **AI limitation found:** The restart email contained only a test identifier.
  Although the technical flow passed, the model invented ticket content from
  the calendar aid. This was not accepted as correct classification. The fix
  and subsequent live regression check are recorded below.

### Verified insufficient-content handling — 2026-11-22

The Collector prompt, output schema and validation now require an explicit
`hasActionableRequest` result and a verbatim `sourceQuote` from the email.
Calendar metadata must not become ticket content. Missing evidence, test-only
identifiers and greetings are rejected; short concrete issues remain valid.

- **Isolated checks:** Four real Ollama cases distinguished identifiers and
  greetings from short and detailed issue reports. All 158 automated tests
  passed, including 16 Collector tests covering invented evidence and the
  existing release/review path.
- **Regular workflow:** The three corrected nodes were published and verified
  in the active Collector. Its connections were unchanged. A new greeting-only
  email automatically triggered the regular workflow with `qwen3:4b-instruct`.
- **Model and validation:** The output had `hasActionableRequest: false`, empty
  title, description and source quote, `issueType: unknown`, and no deadline
  candidates. Validation rejected it; no corresponding ticket was stored.
- **Review and quota:** The mail reservation became `manual_review` with
  `quotaState: released`. The counter went from two completed/one reserved
  during processing to two completed/zero reserved. The original email stayed
  in the inbox with the configured review label. The manual reply was recorded
  as `sent`; this check did not independently verify the recipient's inbox or
  replay the same mail.

Execution and test-data references are kept on C-18. These results establish
the observed cases, not a guarantee against every possible model fabrication.

### Remaining fresh-install acceptance

A complete fresh installation with newly connected credentials and recorded
service/model versions remains open. It must demonstrate automatic intake,
confirmation, filing, status delivery and duplicate prevention after its own
restart. The existing-installation restart and AI regression checks above do
not replace that acceptance. Earlier isolated imports and replay tests remain
separate evidence. The remaining error/limit cases still need a final mapping
to the current release for the complete C-18 demonstration acceptance.

## Ollama Setup

Install [Ollama for Windows](https://docs.ollama.com/windows), then open a new
PowerShell terminal. The desktop app normally runs the API in the background.

```powershell
ollama --version
ollama pull qwen3:4b-instruct
ollama list
Invoke-RestMethod http://localhost:11434/api/tags
ollama run qwen3:4b-instruct "Antworte kurz mit: Bereit"
```

If the API is not running, start `ollama serve` in a separate terminal and keep
it open. Do not start a second server when port 11434 is already occupied.
In n8n create an Ollama credential with Base URL
`http://host.docker.internal:11434` for Docker Desktop, or
`http://localhost:11434` when n8n runs directly on the same host. Select
`qwen3:4b-instruct` in **Ollama Chat Model** and test the credential plus model node.

If Docker cannot reach the host API, check Ollama's bind address and Windows
firewall. Where needed, configure `OLLAMA_HOST=0.0.0.0:11434` for Ollama and restart
it, restricting firewall access to the local Docker environment. This exposes a
listener beyond loopback; do not expose the unauthenticated API to the internet.
See [Ollama with n8n](https://docs.ollama.com/integrations/n8n) and
[Ollama server configuration](https://docs.ollama.com/faq).

### Setup checks and recovery

| Symptom | Check |
| --- | --- |
| Docker named-pipe/WSL error | Start/restart Docker Desktop, wait for engine, then `docker start n8n`. |
| Google credential needs reconnecting | Reconnect that credential and grant its scopes; check consent/test-user settings. |
| Firestore permission denied | Check account, project, IAM for n8n, and auth/rules for the frontend separately. |
| Ollama unavailable | Check `/api/tags`, model tag and Docker-versus-host Base URL. |
| No automatic Gmail run | Check published/active workflow, collector account, inbox search and polling. |

After setup, send one unique test mail and verify one Triage ticket, one matching
confirmation, `erledigt` without INBOX, and the matching daily counter. Repeat
processing to check duplicate prevention. Test status notifications only after
their separate workflow is installed. Record the Git commit, n8n/Docker/Compose/Ollama versions, the model ID from
`ollama list`, and results on C-18. Restart n8n, then repeat a new-mail test to
verify persistent credentials and automatic polling. Keep workflow execution IDs
and test ticket IDs with the result; never record tokens or passwords.
These are full setup/restart acceptance steps for the new installation. Structural
imports and the existing-installation restart check have passed separately;
neither establishes that a complete fresh installation has passed.


## Usage

- From Welcome, choose Create request for the public email request flow.
- Choose Member log in to sign in, register or use the guest login.
- Review task totals and the next deadline on the Summary page.
- Create a task through Add Task or from a Board column.
- Assign contacts, choose a priority and add subtasks.
- Move task cards between the five workflow columns using drag and drop or the mobile status menu.
- Open a task card to edit its data or complete individual subtasks.
- Search the board by task title or description.
- Manage contacts from the Contacts page.

Guest and authenticated users work with the same shared Firestore data set.

## Demo Walkthrough

The steps below are a presentation guide. The separately recorded live result
covers the existing installation from incoming email to status notification.
Use a unique subject such as `DEMO-YYYYMMDD-HHMM - Board does not load` to
identify each run.

### Before the demonstration

- Open the hosted Join app, the sender's mailbox, the collector inbox and n8n
  Executions. Use a separate sender account with an address you can read.
- Confirm Firebase is reachable, Ollama responds, and the regular collector and
  separate status-notification workflow are active. Only one intake workflow
  should watch this inbox. A fresh import also needs the configured status workflow.
- Check today's Europe/Berlin quota: fewer than ten completed plus reserved
  places are needed for the automatic success path. Record its starting value.
  Do not reset the shared production counter for a demonstration.

### From request to confirmation

1. Open Welcome and select **Create request**. On the stakeholder landing page,
   show the quota and select **Create request** to open **Your Request**.
2. Enter your name, the actual sender address, the unique subject and a clear
   message, for example: `When I open the Board, the task list stays empty.
   Please investigate. There is no deadline.` Keep the example free of private data.
3. Select **Send request**. This only opens a draft; it does not submit a ticket.
   Verify recipient `ai.viralreelcreator@gmail.com`, subject and complete message,
   including the appended name and email. For another installation, use its
   configured collector. Send the draft once from the matching sender account.
   If Outlook opens instead of Gmail, configure the browser/OS mail handler;
   being signed into Gmail alone does not select it as the mailto handler.
4. In n8n Executions, find the run for that mail. Allow the one-minute polling
   interval plus model processing time. Follow filtering, mail/day reservation,
   Ollama, validation, ticket storage, confirmation and filing. If processing
   fails, inspect that execution rather than sending duplicate demonstration mail.
5. Use **Member log in** to enter Join and open Board. Find exactly one matching
   ticket under **Triage**. Open it and record its ticket ID; check title,
   description, category, priority, external creator and AI indicator. With this
   example, no deadline should be invented. AI wording may vary.
6. In the sender's inbox, verify exactly one confirmation with that same ticket
   ID. In the collector, verify the source mail has **erledigt** and is no longer
   in Inbox. Compare the quota with its starting value: one completed place added
   and no outstanding reservation for this mail, assuming no concurrent requests.

### From board change to status email

7. Move that ticket once from **Triage** to **To do** using desktop drag and drop
   or the mobile status menu. Wait for the save to succeed, then reload the Board
   to confirm the new status persists; do not move it again merely to refresh.
8. In the status workflow's execution, match the event ID and ticket ID, old/new
   status and original creator's address. In that creator's inbox, verify exactly
   one status message with the same ticket ID and the understandable new status.
   This is a second type of message, separate from the creation confirmation.
   A guest ticket without an email address intentionally receives no status mail.
9. Record subject, execution/event references, ticket ID, quota before/after and
   message counts on C-18. Keep credentials and private mail content out of Git.
   Do not delete shared records as part of the presentation without agreement.

### Optional error and limit demonstrations

Use isolated test reservations/counters for fault injection. At ten of ten,
show the manual-processing explanation: no automatic ticket, one limit reply
without a ticket ID, and **zu bearbeiten** while the mail remains in Inbox.
For a controlled AI/validation/storage failure, verify feedback without a ticket
ID, **zu bearbeiten**, no ticket/success confirmation and one release of the
reserved place even on retry. Do not disable production services to stage this.
If the status workflow is unavailable, mark the final stage as unverified rather
than presenting a creation confirmation as proof of a status notification.

## Project Structure

- `components/assets/`: fonts, images and icons.
- `components/css/` and `components/html/`: shared controls, dialogs and pages.
- `components/js/`: page logic, stores, Firebase adapters and validation.
- `n8n/`: collector and status-notification workflow exports; `n8n/local/` is ignored for local material.
- `tests/`: automated checks; `tests/local/` is ignored.
- Root HTML files: Welcome, login, signup, stakeholder, request form and board pages.
- `main.js` / `base.css`: shared entry logic and base styling.
- `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`: backend configuration.

## Automated Tests

The repository contains automated tests for important logic paths, including:

- task storage and date normalization
- summary metrics and upcoming deadlines
- board search
- board edit validation
- assignee normalization
- contact names and email validation
- privacy-policy consent
- legal-page language defaults, persistence and synchronization
- asynchronous error handling

Run the complete test suite from the project root:

```bash
node --test
```

## Deployment

The application is deployed with Firebase Hosting:

```text
https://join-n8n-andre-2026.web.app/
```

Before a deployment, verify the working tree, run the automated tests and test
the main user stories on desktop and mobile resolutions.

### Hosting package and exclusions

`node scripts/prepare-hosting.mjs` validates every path in
`scripts/hosting-files.json`, recreates only the checked generated directory
`hosting-dist`, and copies the approved application files while preserving URLs.
The same command runs as the Hosting predeploy hook, preventing stale output from
being reused. New application files must be added to the list explicitly.
Missing source files stop preparation before the previous output is removed.

The package contains entry HTML pages, main.js/base.css, component HTML/CSS/JS,
images/icons, fonts and their licenses. It includes the local Firebase **Web SDK**
configuration needed by the browser; these public application identifiers are not
OAuth credentials. Never put passwords, OAuth tokens or service-account keys in
that file. The configuration template is excluded.

Repository metadata, README, tests, documentation, workflow JSON exports, scripts,
logs, environment files and the README/Collector screenshots are not in the
allowlist. Additional Hosting ignore patterns exclude hidden files, JSON, Markdown,
source maps, key files and internal directories. No app compilation is required.

```powershell
node scripts/prepare-hosting.mjs
npx -y firebase-tools@latest emulators:start --only hosting --project join-n8n-andre-2026
```

Open `http://127.0.0.1:5000`. Stop the emulator with Ctrl+C when finished.
After reviewing and approving a release, deploy only Hosting:

```powershell
npx -y firebase-tools@latest deploy --only hosting --project join-n8n-andre-2026
```

Local verification on 2026-11-21: all 193 approved files returned HTTP 200;
the output contained exactly the manifest entries. Sixteen excluded paths returned
HTTP 404, including README, firebase.json, Firestore rules/indexes, .git/config,
.env, both workflow exports, the Web configuration template and repository
screenshots. No Hosting deployment was performed during this verification.

Live verification on 2026-11-21: Hosting deployment completed successfully. All
193 approved paths returned HTTP 200 and the same 16 excluded paths returned
HTTP 404. Browser checks passed for Welcome, the stakeholder page and daily
usage, request-form validation, guest login, Summary, Board navigation and
opening/closing an existing ticket. No tickets were changed and no mail was sent.
This is a Hosting smoke test, not a complete Collector or fresh-install acceptance.
