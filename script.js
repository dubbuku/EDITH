
/* =========================================================
   EDITH JOB TRACKER
   ========================================================= */

/* =========================================================
   GOOGLE APPS SCRIPT URL
   ========================================================= */

const API_URL =
    "https://script.google.com/macros/s/AKfycbz2OdRwVbESI647sS001Y5Sxr1Eto4-cEoEktxeCOeLSx9izz4ewkNDWP5N0N81XR9N/exec";

/* =========================================================
   SERVER-SIDE AUTHENTICATION
   ========================================================= */

const AUTH_TOKEN_KEY = "edithAuthToken";

function getAuthToken() {
    return sessionStorage.getItem(
        AUTH_TOKEN_KEY
    ) || "";
}

function saveAuthToken(token) {
    sessionStorage.setItem(
        AUTH_TOKEN_KEY,
        token
    );
}

function clearAuthToken() {
    sessionStorage.removeItem(
        AUTH_TOKEN_KEY
    );
}

async function authenticateUser(
    username,
    password
) {
    const params =
        new URLSearchParams();

    params.set(
        "action",
        "login"
    );

    params.set(
        "username",
        username
    );

    params.set(
        "password",
        password
    );

    const response =
        await fetch(
            API_URL +
            "?" +
            params.toString(),
            {
                method: "GET",
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            "Login service unavailable."
        );
    }

    const data =
        await response.json();

    if (!data.success) {
        throw new Error(
            data.error ||
            "Incorrect username or password."
        );
    }

    return data;
}



/* =========================================================
   HEADER GREETING / DATE
   ========================================================= */

function getTimeGreeting() {

    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
        return "Good morning";
    }

    if (hour >= 12 && hour < 17) {
        return "Good afternoon";
    }

    if (hour >= 17 && hour < 22) {
        return "Good evening";
    }

    return "Good evening";
}


function updateHeaderGreeting() {

    const greetingLine =
        document.getElementById("greetingLine");

    if (greetingLine) {

        const name =
            loggedInName
                ? loggedInName.textContent.trim()
                : "";

        greetingLine.textContent =
            name
                ? `${getTimeGreeting()}, ${name}`
                : getTimeGreeting();

    }


    if (todayDate) {

        todayDate.textContent =
            new Intl.DateTimeFormat(
                undefined,
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            ).format(new Date());

    }

}

/* =========================================================
   LOGIN
   ========================================================= */

/* =========================================================
   SAME-TAB SESSION

   sessionStorage survives refreshes in this tab, but is
   intentionally NOT shared with a newly opened tab/window.
   Closing the tab clears it, so a fresh sign-in is required.
   ========================================================= */

const SESSION_KEY = "edithSession";
const PAGE_KEY = "edithCurrentPage";

function saveSession() {

    sessionStorage.setItem(
        SESSION_KEY,
        loggedInName ? loggedInName.textContent : ""
    );

    sessionStorage.setItem(
        PAGE_KEY,
        currentPage
    );

}

function clearSession() {

    sessionStorage.removeItem(
        SESSION_KEY
    );

    sessionStorage.removeItem(
        PAGE_KEY
    );

    clearAuthToken();

}

/* =========================================================
   APPLICATION STATE
   ========================================================= */

let jobs = [];

let currentPage = "today";

let currentDetailsJob = null;

/* Page from which the job details were opened */
let detailsOriginPage = "today";

let pendingApplicationJob = null;

let applicationWaitingForReturn = false;

let applicationPromptShown = false;

/* =========================================================
   FILTER STATE
   ========================================================= */

let selectedApplication = "All";

let selectedWorkType = ["All"];

let selectedResult = ["All"];

let selectedAppliedStatus = ["All"];

let selectedAppliedWork = ["All"];

let selectedProgressStatus = ["All"];

let selectedProgressWork = ["All"];

/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const loginForm =
    document.getElementById("loginForm");

const usernameInput =
    document.getElementById("username");

const passwordInput =
    document.getElementById("password");

const loginError =
    document.getElementById("loginError");

const loginSubmitButton =
    loginForm
        ? loginForm.querySelector(
            'button[type="submit"]'
        )
        : null;

function updateLoginGlow() {

    if (!loginSubmitButton) {
        return;
    }

    const username =
        usernameInput
            ? usernameInput.value.trim()
            : "";

    const password =
        passwordInput
            ? passwordInput.value
            : "";

    loginSubmitButton.classList.toggle(
        "login-active",
        username.length > 0 ||
        password.length > 0
    );

}

if (usernameInput) {

    usernameInput.addEventListener(
        "input",
        updateLoginGlow
    );

}

if (passwordInput) {

    passwordInput.addEventListener(
        "input",
        updateLoginGlow
    );

}

updateLoginGlow();


const loginScreen =
    document.getElementById("loginScreen");

const dashboard =
    document.getElementById("dashboard");

const loggedInName =
    document.getElementById("loggedInName");

const todayDate =
    document.getElementById("todayDate");

const logoutButton =
    document.getElementById("logoutButton");

const globalSearch =
    document.getElementById("globalSearch");

const navAppliedCount =
    document.getElementById("navAppliedCount");

const navToApplyCount =
    document.getElementById("navToApplyCount");

/* =========================================================
   GRIDS
   ========================================================= */

const todayJobGrid =
    document.getElementById("todayJobGrid");

const currentOpportunityGrid =
    document.getElementById("currentOpportunityGrid");

const jobsGrid =
    document.getElementById("jobsGrid");

const appliedGrid =
    document.getElementById("appliedGrid");

const progressGrid =
    document.getElementById("progressGrid");

const favouritesGrid =
    document.getElementById("favouritesGrid");

/* =========================================================
   COUNTS
   ========================================================= */

const todayJobCount =
    document.getElementById("todayJobCount");

const currentOpportunityCount =
    document.getElementById("currentOpportunityCount");

const jobsCount =
    document.getElementById("jobsCount");

const appliedCount =
    document.getElementById("appliedCount");

const progressCount =
    document.getElementById("progressCount");

/* =========================================================
   DETAILS PAGE
   ========================================================= */

const jobDetailsPage =
    document.getElementById("jobDetailsPage");

const jobDetailsContent =
    document.getElementById("jobDetailsContent");

const detailsBackButton =
    document.getElementById("detailsBackButton");

const detailsFavouriteButton =
    document.getElementById(
        "detailsFavouriteButton"
    );

/* =========================================================
   NAVIGATION
   ========================================================= */

const navButtons =
    document.querySelectorAll(
        ".nav-button"
    );

const pages =
    document.querySelectorAll(
        ".page"
    );

/* =========================================================
   BOOLEAN HELPER
   ========================================================= */

function toBoolean(value) {

    return (
        value === true ||
        value === "TRUE" ||
        value === "true" ||
        value === 1 ||
        value === "1"
    );

}

/* =========================================================
   NORMALIZE JOB
   ========================================================= */

function normalizeJob(raw) {

    const applied =
        toBoolean(
            raw["Applied"]
        );

    const favourite =
        toBoolean(
            raw["Favourite"]
        );

    const userRejected =
        toBoolean(
            raw["User Rejected"]
        );

    const result =
        String(
            raw["Result"] || ""
        ).trim();

    let status;

    /*
     * USER REJECTED
     */

    if (userRejected) {

        status = "I Rejected";

    }

    /*
     * NOT APPLIED
     */

    else if (!applied) {

        status = "To Apply";

    }

    /*
     * INTERVIEW
     */

    else if (
        result.toLowerCase() ===
        "interview"
    ) {

        status = "Interview";

    }

    /*
     * COMPANY REJECTED
     */

    else if (
        result.toLowerCase() ===
        "rejected"
    ) {

        status = "Rejected";

    }

    /*
     * NORMAL APPLIED
     */

    else {

        status = "Applied";

    }

    return {

        id:
            String(
                raw["Job ID"] || ""
            ),

        dateAdded:
            raw["Date Added"] || "",

        company:
            String(
                raw["Company"] || ""
            ),

        role:
            String(
                raw["Role"] || ""
            ),

        location:
            String(
                raw["Location"] || ""
            ),

        workType:
            String(
                raw["Work Type"] || ""
            ),

        applicationLink:
            String(
                raw["Application Link"] || ""
            ),

        applied:
            applied,

        appliedDate:
            raw["Applied Date"] || "",

        result:
            result,

        favorite:
            favourite,

        notes:
            String(
                raw["Notes"] || ""
            ),

        userRejected:
            userRejected,

        status:
            status,

        showApplicationPrompt:
            false

    };

}

/* =========================================================
   LOAD JOBS
   ========================================================= */

async function loadJobs() {

    try {

        const token =
            getAuthToken();

        if (!token) {
            throw new Error(
                "AUTH_REQUIRED"
            );
        }

        const params =
            new URLSearchParams();

        params.set(
            "token",
            token
        );

        const response =
            await fetch(
                API_URL +
                "?" +
                params.toString(),
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
            );

        }

        const data =
            await response.json();

        if (!data.success) {

            throw new Error(
                data.error ||
                "Unable to load jobs."
            );

        }

        jobs =
            (data.jobs || [])
            .map(
                normalizeJob
            );

        renderCurrentPage();

    }

    catch (error) {

        console.error(
            "EDITH ERROR:",
            error
        );

        if (
            error.message ===
            "AUTH_REQUIRED"
        ) {

            clearSession();

            dashboard.classList.add(
                "hidden"
            );

            loginScreen.classList.remove(
                "hidden"
            );

            loginError.textContent =
                "Your session has expired. Please sign in again.";

            return;

        }

        [
            todayJobGrid,
            currentOpportunityGrid,
            jobsGrid,
            appliedGrid,
            progressGrid,
            favouritesGrid

        ].forEach(
            function(grid) {

                if (!grid) return;

                grid.innerHTML = `

                    <div class="empty-state">

                        <div class="empty-state-title">
                            CONNECTION ERROR
                        </div>

                        <div class="empty-state-text">
                            ${escapeHtml(
                                error.message
                            )}
                        </div>

                    </div>

                `;

            }
        );

    }

}

/* =========================================================
   UPDATE JOB
   ========================================================= */

async function updateJob(
    jobId,
    updates
) {

    const job =
        jobs.find(
            function(item) {

                return item.id === jobId;

            }
        );

    if (!job) {

        return false;

    }

    /*
     * Optimistic update:
     * change EDITH immediately instead of waiting for
     * Google Sheets and then downloading every job again.
     */

    const previous = {

        applied: job.applied,
        appliedDate: job.appliedDate,
        result: job.result,
        favorite: job.favorite,
        userRejected: job.userRejected,
        status: job.status

    };

    if (updates.applied !== undefined) {

        job.showApplicationPrompt = false;

        if (
            pendingApplicationJob &&
            pendingApplicationJob.id === job.id
        ) {
            pendingApplicationJob = null;
            applicationWaitingForReturn = false;
            applicationPromptShown = false;
        }

        job.applied =
            toBoolean(updates.applied);

        if (job.applied) {

            if (!job.appliedDate) {

                job.appliedDate =
                    new Date()
                    .toISOString()
                    .slice(0, 10);

            }

            if (!job.result) {

                job.result = "Pending";

            }

        }
        else {

            job.appliedDate = "";

        }

    }

    if (updates.favourite !== undefined) {

        job.favorite =
            toBoolean(updates.favourite);

    }

    if (updates.userRejected !== undefined) {

        job.userRejected =
            toBoolean(updates.userRejected);

        if (job.userRejected) {

            job.favorite = false;

        }

    }

    /* Recalculate the displayed status locally. */

    if (job.userRejected) {

        job.status = "I Rejected";

    }
    else if (!job.applied) {

        job.status = "To Apply";

    }
    else if (
        String(job.result || "")
        .trim()
        .toLowerCase() === "interview"
    ) {

        job.status = "Interview";

    }
    else if (
        String(job.result || "")
        .trim()
        .toLowerCase() === "rejected"
    ) {

        job.status = "Rejected";

    }
    else {

        job.status = "Applied";

    }

    /* Keep the open details object pointing at the same job. */

    if (currentDetailsJob && currentDetailsJob.id === job.id) {

        currentDetailsJob = job;

        renderJobDetails(job);

    }
    else {

        renderCurrentPage();

    }

    /*
     * Save to Google Sheets in the background.
     * The UI does not wait for this request.
     */

    const params =
        new URLSearchParams();

    params.set(
        "action",
        "update"
    );

    params.set(
        "jobId",
        jobId
    );

    params.set(
        "token",
        getAuthToken()
    );

    Object.keys(updates).forEach(
        function(key) {

            params.set(
                key,
                String(updates[key])
            );

        }
    );

    try {

        const response =
            await fetch(
                API_URL +
                "?" +
                params.toString(),
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                "Update failed."
            );

        }

        const data =
            await response.json();

        if (!data.success) {

            throw new Error(
                data.error ||
                "Update failed."
            );

        }

        return true;

    }
    catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );

        /* Revert only if this job still exists. */

        const currentJob =
            jobs.find(
                function(item) {

                    return item.id === jobId;

                }
            );

        if (currentJob) {

            currentJob.applied =
                previous.applied;

            currentJob.appliedDate =
                previous.appliedDate;

            currentJob.result =
                previous.result;

            currentJob.favorite =
                previous.favorite;

            currentJob.userRejected =
                previous.userRejected;

            currentJob.status =
                previous.status;

        }

        if (currentDetailsJob && currentDetailsJob.id === jobId) {

            currentDetailsJob = currentJob || null;

            if (currentDetailsJob) {

                renderJobDetails(
                    currentDetailsJob
                );

            }

        }
        else {

            renderCurrentPage();

        }

        alert(
            "EDITH could not save this change. Your change has been reverted."
        );

        return false;

    }

}

/* =========================================================
   LOGIN
   ========================================================= */

loginForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const username =
            usernameInput.value
            .trim()
            .toLowerCase();

        const password =
            passwordInput.value;

        loginError.textContent =
            "";

        try {

            const auth =
                await authenticateUser(
                    username,
                    password
                );

            saveAuthToken(
                auth.token
            );

            loggedInName.textContent =
                auth.displayName;

            sessionStorage.setItem(
                "edithUserName",
                auth.displayName
            );

            updateHeaderGreeting();

            loginScreen.classList.add(
                "hidden"
            );

            dashboard.classList.remove(
                "hidden"
            );

            const savedPage =
                sessionStorage.getItem(
                    PAGE_KEY
                );

            if (savedPage) {

                currentPage =
                    savedPage;

                navButtons.forEach(
                    function(button) {

                        button.classList.toggle(
                            "active",
                            button.dataset.page ===
                            currentPage
                        );

                    }
                );

                pages.forEach(
                    function(page) {

                        page.classList.toggle(
                            "active-page",
                            page.id ===
                            currentPage + "Page"
                        );

                    }
                );

            }

            saveSession();

            await loadJobs();

        }

        catch (error) {

            clearAuthToken();

            loginError.textContent =
                error.message ===
                "AUTH_REQUIRED"
                    ? "Login required."
                    : error.message ||
                      "Incorrect username or password.";

        }

    }
);

/* =========================================================
   LOGOUT
   ========================================================= */

logoutButton.addEventListener(
    "click",
    async function() {

        const token =
            getAuthToken();

        if (token) {

            try {

                const params =
                    new URLSearchParams();

                params.set(
                    "action",
                    "logout"
                );

                params.set(
                    "token",
                    token
                );

                await fetch(
                    API_URL +
                    "?" +
                    params.toString(),
                    {
                        method: "GET",
                        cache: "no-store"
                    }
                );

            }
            catch (error) {

                console.warn(
                    "Logout request failed.",
                    error
                );

            }

        }

        closeJobDetails();

        jobs.forEach(
            function(job) {
                job.showApplicationPrompt =
                    false;
            }
        );

        pendingApplicationJob =
            null;

        applicationWaitingForReturn =
            false;

        applicationPromptShown =
            false;

        clearSession();

        dashboard.classList.add(
            "hidden"
        );

        loginScreen.classList.remove(
            "hidden"
        );

        usernameInput.value = "";

        passwordInput.value = "";

    }
);

/* =========================================================
   NAVIGATION
   ========================================================= */

navButtons.forEach(
    function(button) {

        button.addEventListener(
            "click",
            function() {

                currentPage =
                    button.dataset.page;

                saveSession();

                navButtons.forEach(
                    function(item) {

                        item.classList.remove(
                            "active"
                        );

                    }
                );

                button.classList.add(
                    "active"
                );

                pages.forEach(
                    function(page) {

                        page.classList.remove(
                            "active-page"
                        );

                    }
                );

                const page =
                    document.getElementById(
                        currentPage +
                        "Page"
                    );

                if (page) {

                    page.classList.add(
                        "active-page"
                    );

                }

                renderCurrentPage();

            }
        );

    }
);

/* =========================================================
   SEARCH
   ========================================================= */

globalSearch.addEventListener(
    "input",
    function() {

        renderCurrentPage();

    }
);

function matchesSearch(
    job,
    search
) {

    if (!search) {

        return true;

    }

    const text = [

        job.company,
        job.role,
        job.location,
        job.workType,
        job.notes

    ]
    .join(" ")
    .toLowerCase();

    return text.includes(
        search
    );

}

/* =========================================================
   RENDER CURRENT PAGE
   ========================================================= */

function renderCurrentPage() {

    updateNavOpportunityCounters();


    renderToday();

    renderJobs();

    renderApplied();

    renderProgress();

    renderFavourites();

}



/* =========================================================
   TODAY
   ========================================================= */

function parseDateAdded(value) {

    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? null
            : value;
    }

    const text = String(value).trim();

    if (!text) {
        return null;
    }

    // ISO / standard date strings.
    const standardDate = new Date(text);

    if (!Number.isNaN(standardDate.getTime())) {
        return standardDate;
    }

    // DD/MM/YYYY or DD-MM-YYYY.
    const numericMatch =
        text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);

    if (numericMatch) {
        const day = Number(numericMatch[1]);
        const month = Number(numericMatch[2]) - 1;
        const year = Number(numericMatch[3]);

        const parsed = new Date(year, month, day);

        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    // Common text format such as "14 Aug 2026".
    const textMatch =
        text.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);

    if (textMatch) {
        const parsed = new Date(
            `${textMatch[1]} ${textMatch[2]} ${textMatch[3]}`
        );

        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return null;
}

function isToday(value) {

    const date = parseDateAdded(value);

    if (!date) {
        return false;
    }

    const now = new Date();

    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    );
}

function sortNewestFirst(list) {

    return [...list].sort(
        function(a, b) {

            const dateA = parseDateAdded(a.dateAdded);
            const dateB = parseDateAdded(b.dateAdded);

            if (!dateA && !dateB) {
                return 0;
            }

            if (!dateA) {
                return 1;
            }

            if (!dateB) {
                return -1;
            }

            return dateB.getTime() - dateA.getTime();
        }
    );
}

/* =========================================================
   TODAY

   SECTION 1
   ----------
   Every active opportunity added today.

   SECTION 2
   ----------
   Older active opportunities that are still waiting for the
   user to apply. Today's opportunities are excluded here so
   the same job never appears twice on the page.
   ========================================================= */

/* =========================================================
   GLOBAL OPPORTUNITY COUNTERS
   ========================================================= */

function updateNavOpportunityCounters() {

    const appliedCount =
        jobs.filter(
            function(job) {
                return job.applied === true;
            }
        ).length;

    const toApplyCount =
        jobs.filter(
            function(job) {
                return (
                    !job.applied &&
                    !job.userRejected &&
                    job.status !== "Rejected"
                );
            }
        ).length;

    if (navAppliedCount) {
        navAppliedCount.textContent =
            appliedCount;
    }

    if (navToApplyCount) {
        navToApplyCount.textContent =
            toApplyCount;
    }

}


function renderToday() {

    const search =
        globalSearch.value
        .trim()
        .toLowerCase();

    const activeJobs =
        jobs.filter(
            function(job) {

                if (job.userRejected) {
                    return false;
                }

                if (job.status === "Rejected") {
                    return false;
                }

                return matchesSearch(
                    job,
                    search
                );
            }
        );

    const addedToday =
        sortNewestFirst(
            activeJobs.filter(
                function(job) {
                    return isToday(job.dateAdded);
                }
            )
        );

    const currentToApply =
        sortNewestFirst(
            activeJobs.filter(
                function(job) {
                    return (
                        !job.applied &&
                        !isToday(job.dateAdded)
                    );
                }
            )
        );

    todayJobCount.textContent =
        addedToday.length;

    const todayOpportunityMessage =
        document.getElementById(
            "todayOpportunityMessage"
        );

    if (todayOpportunityMessage) {

        todayOpportunityMessage.textContent =
            `Check out today’s ${addedToday.length} opportunities.`;

    }

    currentOpportunityCount.textContent =
        currentToApply.length;

    renderGrid(
        todayJobGrid,
        addedToday
    );

    renderGrid(
        currentOpportunityGrid,
        currentToApply
    );

}

/* =========================================================
   JOBS
   ========================================================= */

function renderJobs() {

    const search =
        globalSearch.value
        .trim()
        .toLowerCase();

    const filtered =
        jobs.filter(
            function(job) {

                if (
                    !matchesSearch(
                        job,
                        search
                    )
                ) {

                    return false;

                }

                /*
                 * APPLICATION FILTER
                 */

                if (
                    selectedApplication ===
                    "To Apply"
                ) {

                    /*
                     * To Apply means the job has not been applied to
                     * and has not been rejected by the user.
                     */
                    if (
                        job.applied ||
                        job.userRejected
                    ) {

                        return false;

                    }

                }

                if (
                    selectedApplication ===
                    "Applied"
                ) {

                    /*
                     * Application filter is independent of Result.
                     */
                    if (!job.applied) {

                        return false;

                    }

                }

                /*
                 * WORK TYPE — multi-select.
                 * ALL is visually selected when every work type
                 * is functionally included.
                 */

                if (
                    !selectedWorkType.includes("All") &&
                    !selectedWorkType.includes(job.workType)
                ) {

                    return false;

                }

                /*
                 * RESULT — multi-select.
                 * ALL is the default shortcut for all results.
                 * If all individual result filters are turned off,
                 * selectedResult becomes empty and no result filtering
                 * is applied.
                 */

                if (
                    !selectedResult.includes("All") &&
                    selectedResult.length > 0
                ) {

                    const resultMatches =
                        selectedResult.some(
                            function(filter) {

                                if (filter === "Interview") {
                                    return job.status === "Interview";
                                }

                                if (filter === "Rejected") {
                                    return job.status === "Rejected";
                                }

                                if (filter === "I Rejected") {
                                    return job.userRejected;
                                }

                                return false;

                            }
                        );

                    if (!resultMatches) {
                        return false;
                    }

                }

                return true;

            }
        );

    jobsCount.textContent =
        filtered.length;

    renderGrid(
        jobsGrid,
        filtered
    );

}

/* =========================================================
   APPLIED
   ========================================================= */

function renderApplied() {

    const search =
        globalSearch.value
        .trim()
        .toLowerCase();

    const filtered =
        jobs.filter(
            function(job) {

                if (
                    !job.applied ||
                    job.userRejected
                ) {

                    return false;

                }

                if (
                    !matchesSearch(
                        job,
                        search
                    )
                ) {

                    return false;

                }

                if (
                    !selectedAppliedStatus.includes("All") &&
                    !selectedAppliedStatus.includes(job.status)
                ) {

                    return false;

                }

                if (
                    !selectedAppliedWork.includes("All") &&
                    !selectedAppliedWork.includes(job.workType)
                ) {

                    return false;

                }

                return true;

            }
        );

    appliedCount.textContent =
        filtered.length;

    renderGrid(
        appliedGrid,
        filtered
    );

}

/* =========================================================
   PROGRESS
   ========================================================= */

function renderProgress() {

    const search =
        globalSearch.value
        .trim()
        .toLowerCase();

    const filtered =
        jobs.filter(
            function(job) {

                if (
                    !job.applied &&
                    !job.userRejected
                ) {

                    return false;

                }

                if (
                    !matchesSearch(
                        job,
                        search
                    )
                ) {

                    return false;

                }

                if (
                    !selectedProgressStatus.includes("All") &&
                    !selectedProgressStatus.includes(job.status)
                ) {

                    return false;

                }

                if (
                    !selectedProgressWork.includes("All") &&
                    !selectedProgressWork.includes(job.workType)
                ) {

                    return false;

                }

                return true;

            }
        );

    progressCount.textContent =
        filtered.length;

    renderGrid(
        progressGrid,
        filtered
    );

}

/* =========================================================
   FAVOURITES
   ========================================================= */

function renderFavourites() {

    const search =
        globalSearch.value
        .trim()
        .toLowerCase();

    const filtered =
        jobs.filter(
            function(job) {

                /*
                 * I REJECTED:
                 * remove from favourites.
                 */

                if (
                    job.userRejected
                ) {

                    return false;

                }

                /*
                 * COMPANY REJECTED:
                 * KEEP if favourite.
                 */

                if (
                    !job.favorite
                ) {

                    return false;

                }

                return matchesSearch(
                    job,
                    search
                );

            }
        );

    renderGrid(
        favouritesGrid,
        filtered
    );

}

/* =========================================================
   GRID
   ========================================================= */

function renderGrid(
    grid,
    list
) {

    if (!grid) {

        return;

    }

    grid.innerHTML = "";

    if (
        list.length ===
        0
    ) {

        grid.innerHTML = `

            <div class="empty-state">

                <div class="empty-state-title">
                    Nothing here.
                </div>

                <div class="empty-state-text">
                    Try changing your filters.
                </div>

            </div>

        `;

        return;

    }

    list.forEach(
        function(job) {

            grid.appendChild(
                createJobCard(
                    job
                )
            );

        }
    );

}

/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(
    status
) {

    switch (
        String(
            status || ""
        )
        .trim()
        .toLowerCase()
    ) {

        case "to apply":
            return "status-to-apply";

        case "applied":
            return "status-applied";

        case "interview":
            return "status-interview";

        case "rejected":
            return "status-rejected";

        case "i rejected":
            return "status-i-rejected";

        default:
            return "";

    }

}

/* =========================================================
   WORK TYPE CLASS
   =========================================================
   
   HYBRID  = BLUE
   REMOTE  = GREEN
   ON-SITE = PURPLE
   
   ========================================================= */

function getWorkTypeClass(
    workType
) {

    switch (
        String(
            workType || ""
        )
        .trim()
        .toLowerCase()
    ) {

        case "hybrid":
            return "work-type-hybrid";

        case "remote":
            return "work-type-remote";

        case "on-site":
        case "onsite":
        case "on site":
            return "work-type-onsite";

        default:
            return "";

    }

}

/* =========================================================
   JOB CARD
   ========================================================= */

function createJobCard(
    job
) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "job-card";

    card.dataset.jobId =
        job.id;

    /*
     * INTERVIEW
     */

    if (
        job.status ===
        "Interview"
    ) {

        card.classList.add(
            "interview-card"
        );

    }

    /*
     * REJECTED
     */

    if (
        job.status ===
        "Rejected" ||
        job.status ===
        "I Rejected"
    ) {

        card.classList.add(
            "rejected-card"
        );

    }

    const statusClass =
        getStatusClass(
            job.status
        );

    const workTypeClass =
        getWorkTypeClass(
            job.workType
        );

    /*
     * FAVOURITE
     */

    const favourite =
        job.favorite &&
        !job.userRejected;

    /*
     * DIRECT APPLY
     */

    const applyHTML =
        job.applicationLink

        ?

        `

            <a
                href="${escapeAttribute(
                    job.applicationLink
                )}"
                target="_blank"
                rel="noopener noreferrer"
                class="
                    job-action-button
                    card-apply-link
                "
            >
                Apply ↗
            </a>

        `

        :

        `

            <button
                class="
                    job-action-button
                    disabled
                "
                type="button"
                disabled
            >
                No Link
            </button>

        `;

    /*
     * CARD HTML
     */

    card.innerHTML = `

        <div class="job-card-content">

            <!-- TOP -->

            <div class="job-card-top">

                <div class="job-company">

                    ${escapeHtml(
                        job.company
                    )}

                </div>

                <button
                    type="button"
                    class="
                        favorite-button
                        card-favourite-button
                        ${
                            favourite
                            ? "favorite-active"
                            : ""
                        }
                    "
                >

                    ${
                        favourite
                        ? "★"
                        : "☆"
                    }

                </button>

            </div>


            <!-- ROLE -->

            <div class="job-role">

                ${escapeHtml(
                    job.role
                )}

            </div>


            <!-- LOCATION -->

            <div class="job-location">

                <span>
                    📍
                </span>

                ${escapeHtml(
                    job.location
                )}

            </div>


            <!-- STATUS + WORK TYPE -->

            <div class="job-status-row">

                <div
                    class="
                        job-status
                        ${statusClass}
                    "
                >

                    <span
                        class="status-dot"
                    ></span>

                    ${escapeHtml(
                        job.status
                    )}

                </div>

                <div
                    class="
                        job-work-type
                        ${workTypeClass}
                    "
                >

                    ${escapeHtml(
                        job.workType
                    )}

                </div>

            </div>


            <!-- DIVIDER -->

            <div
                class="job-card-divider"
            ></div>


            <!-- BOTTOM -->

            <div class="job-card-bottom">

                <div class="job-date">

                    ${escapeHtml(
                        job.dateAdded
                    )}

                </div>

                <div class="job-actions-area">

                    ${
                        job.status ===
                        "To Apply"

                        ?

                        applyHTML

                        :

                        `

                            <button
                                type="button"
                                class="
                                    job-action-button
                                    card-view-button
                                "
                            >
                                View
                            </button>

                        `

                    }

                </div>

            </div>


            <!-- APPLICATION PROMPT -->

            ${
                job.showApplicationPrompt
                ?
                createInlineApplicationPrompt(
                    job
                )
                :
                ""
            }

        </div>

    `;

    /* =====================================================
       CARD CLICK
       ===================================================== */

    card.addEventListener(
        "click",
        function() {

            openJobDetails(
                job
            );

        }
    );

    /* =====================================================
       FAVOURITE BUTTON
       ===================================================== */

    const favouriteButton =
        card.querySelector(
            ".card-favourite-button"
        );

    if (favouriteButton) {

        favouriteButton.addEventListener(
            "click",
            async function(event) {

                event.preventDefault();

                event.stopPropagation();

                /*
                 * I REJECTED JOBS CANNOT
                 * BECOME FAVOURITES.
                 */

                if (
                    job.userRejected
                ) {

                    return;

                }

                await updateJob(
                    job.id,
                    {
                        favourite:
                            !job.favorite
                    }
                );

            }
        );

    }

    /* =====================================================
       DIRECT APPLY LINK
       ===================================================== */

    const applyLink =
        card.querySelector(
            ".card-apply-link"
        );

    if (applyLink) {

        applyLink.addEventListener(
            "click",
            function(event) {

                /*
                 * VERY IMPORTANT:
                 * Do not let card click fire.
                 */

                event.stopPropagation();

                pendingApplicationJob =
                    job;

                applicationWaitingForReturn =
                    true;

                applicationPromptShown =
                    false;

            }
        );

    }

    /* =====================================================
       VIEW BUTTON
       ===================================================== */

    const viewButton =
        card.querySelector(
            ".card-view-button"
        );

    if (viewButton) {

        viewButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();

                openJobDetails(
                    job
                );

            }
        );

    }

    /* =====================================================
       APPLICATION PROMPT
       ===================================================== */

    const prompt =
        card.querySelector(
            ".edith-inline-application"
        );

    if (prompt) {

        prompt.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();

            }
        );

        const notYet =
            prompt.querySelector(
                ".edith-inline-not-yet"
            );

        const yesApplied =
            prompt.querySelector(
                ".edith-inline-yes"
            );

        /*
         * NOT YET
         */

        if (notYet) {

            notYet.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    event.stopPropagation();

                    job.showApplicationPrompt =
                        false;

                    pendingApplicationJob =
                        null;

                    applicationWaitingForReturn =
                        false;

                    applicationPromptShown =
                        false;

                    renderCurrentPage();

                }
            );

        }

        /*
         * YES I APPLIED
         */

        if (yesApplied) {

            yesApplied.addEventListener(
                "click",
                async function(event) {

                    event.preventDefault();

                    event.stopPropagation();

                    yesApplied.disabled =
                        true;

                    yesApplied.textContent =
                        "SAVING...";

                    const success =
                        await updateJob(
                            job.id,
                            {
                                applied: true
                            }
                        );

                    if (success) {

                        job.showApplicationPrompt =
                            false;

                        pendingApplicationJob =
                            null;

                        applicationWaitingForReturn =
                            false;

                        applicationPromptShown =
                            false;

                        renderCurrentPage();

                    }

                }
            );

        }

    }

    return card;

}

/* =========================================================
   APPLICATION PROMPT
   ========================================================= */

function createInlineApplicationPrompt(
    job
) {

    return `

        <div
            class="
                edith-inline-application
            "
        >

            <div
                class="
                    edith-inline-application-title
                "
            >
                HAVE YOU APPLIED?
            </div>

            <div
                class="
                    edith-inline-application-text
                "
            >

                Did you submit the application
                for

                <strong>
                    ${escapeHtml(
                        job.role
                    )}
                </strong>

                at

                <strong>
                    ${escapeHtml(
                        job.company
                    )}
                </strong>?

            </div>

            <div
                class="
                    edith-inline-application-actions
                "
            >

                <button
                    type="button"
                    class="edith-inline-not-yet"
                >
                    NOT YET
                </button>

                <button
                    type="button"
                    class="edith-inline-yes"
                >
                    YES, I APPLIED
                </button>

            </div>

        </div>

    `;

}

/* =========================================================
   JOB DETAILS
   ========================================================= */

function openJobDetails(
    job
) {

    /* Remember exactly where this card was opened from. */
    detailsOriginPage = currentPage;

    currentDetailsJob =
        job;

    renderJobDetails(
        job
    );

    jobDetailsPage.classList.add(
        "open"
    );

    jobDetailsPage.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "details-open"
    );

}

/* =========================================================
   CLOSE DETAILS + RETURN TO ORIGIN PAGE
   ========================================================= */

function returnToDetailsOriginPage() {

    currentPage = detailsOriginPage || "today";

    saveSession();

    navButtons.forEach(
        function(button) {

            button.classList.toggle(
                "active",
                button.dataset.page === currentPage
            );

        }
    );

    pages.forEach(
        function(page) {

            page.classList.toggle(
                "active-page",
                page.id === currentPage + "Page"
            );

        }
    );

    renderCurrentPage();
}

function closeJobDetails() {

    jobDetailsPage.classList.remove(
        "open"
    );

    jobDetailsPage.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "details-open"
    );

    currentDetailsJob =
        null;

}

/* =========================================================
   DETAILS RENDER
   ========================================================= */

function renderJobDetails(
    job
) {

    const favourite =
        job.favorite &&
        !job.userRejected;

    const statusClass =
        getStatusClass(
            job.status
        );

    const workTypeClass =
        getWorkTypeClass(
            job.workType
        );

    jobDetailsContent.innerHTML = `

        <div class="detail-company">

            ${escapeHtml(
                job.company
            )}

        </div>

        <h1 class="detail-role">

            ${escapeHtml(
                job.role
            )}

        </h1>

        <div class="detail-location">

            📍

            ${escapeHtml(
                job.location
            )}

        </div>

        <div
            class="
                detail-status
                ${statusClass}
            "
        >

            <span
                class="status-dot"
            ></span>

            ${escapeHtml(
                job.status
            )}

        </div>

        <div
            class="
                detail-work-type
                ${workTypeClass}
            "
        >

            ${escapeHtml(
                job.workType
            )}

        </div>

        <div class="detail-section">

            <div class="detail-label">
                APPLICATION
            </div>

            ${
                job.applicationLink

                ?

                `

                    <a
                        href="${escapeAttribute(
                            job.applicationLink
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                        id="detailApplyButton"
                        class="
                            detail-apply-button
                        "
                    >
                        APPLY ↗
                    </a>

                `

                :

                `

                    <div class="detail-no-link">
                        No application link available.
                    </div>

                `

            }

        </div>

        <div class="detail-section">

            <div class="detail-label">
                DATE ADDED
            </div>

            <div class="detail-value">

                ${escapeHtml(
                    job.dateAdded
                )}

            </div>

        </div>

        ${
            job.appliedDate

            ?

            `

                <div class="detail-section">

                    <div class="detail-label">
                        APPLIED DATE
                    </div>

                    <div class="detail-value">

                        ${escapeHtml(
                            job.appliedDate
                        )}

                    </div>

                </div>

            `

            :

            ""

        }

        <div class="detail-section">

            <div class="detail-label">
                NOTES
            </div>

            <div class="detail-notes">

                ${
                    job.notes
                    ?
                    escapeHtml(
                        job.notes
                    )
                    :
                    "No notes added."
                }

            </div>

        </div>

        <div class="detail-section">

            <div class="detail-label">
                ACTION
            </div>

            <button
                type="button"
                id="detailRejectButton"
                class="detail-reject-button"
            >

                ${
                    job.userRejected
                    ? "REJECTED"
                    : "I REJECT THIS"
                }

            </button>

        </div>

    `;

    detailsFavouriteButton.textContent =
        favourite
        ? "★"
        : "☆";

    detailsFavouriteButton.classList.toggle(
        "favorite-active",
        favourite
    );

    /* =====================================================
       DETAIL APPLY
       ===================================================== */

    const detailApply =
        document.getElementById(
            "detailApplyButton"
        );

    if (detailApply) {

        detailApply.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();

                pendingApplicationJob =
                    job;

                applicationWaitingForReturn =
                    true;

                applicationPromptShown =
                    false;

            }
        );

    }

    /* =====================================================
       DETAIL REJECT
       ===================================================== */

    const rejectButton =
        document.getElementById(
            "detailRejectButton"
        );

    if (rejectButton) {

        rejectButton.addEventListener(
            "click",
            async function() {

                if (
                    job.userRejected
                ) {

                    return;

                }

                const confirmed =
                    confirm(
                        "Reject this opportunity?"
                    );

                if (!confirmed) {

                    return;

                }

                /*
                 * USER REJECTED:
                 *
                 * User Rejected = TRUE
                 *
                 * Apps Script also removes
                 * Favourite.
                 */

                /*
                 * Update the UI immediately. Google Sheets is
                 * updated in the background.
                 */
                updateJob(
                    job.id,
                    {
                        userRejected: true
                    }
                );

                closeJobDetails();
                returnToDetailsOriginPage();

            }
        );

    }

}

/* =========================================================
   DETAILS BACK
   ========================================================= */

detailsBackButton.addEventListener(
    "click",
    function() {

        closeJobDetails();

    }
);

/* =========================================================
   DETAILS FAVOURITE
   ========================================================= */

detailsFavouriteButton.addEventListener(
    "click",
    async function(event) {

        event.preventDefault();

        event.stopPropagation();

        if (!currentDetailsJob) {

            return;

        }

        if (
            currentDetailsJob.userRejected
        ) {

            return;

        }

        await updateJob(
            currentDetailsJob.id,
            {
                favourite:
                    !currentDetailsJob.favorite
            }
        );

    }
);

/* =========================================================
   APPLICATION RETURN
   ========================================================= */

function handleApplicationReturn() {

    if (
        !pendingApplicationJob
    ) {

        return;

    }

    if (
        !applicationWaitingForReturn
    ) {

        return;

    }

    if (
        applicationPromptShown
    ) {

        return;

    }

    const job =
        jobs.find(
            function(item) {

                return (
                    item.id ===
                    pendingApplicationJob.id
                );

            }
        );

    if (!job) {

        return;

    }

    if (job.applied) {

        job.showApplicationPrompt = false;
        pendingApplicationJob = null;
        applicationWaitingForReturn = false;
        applicationPromptShown = false;

        renderCurrentPage();

        return;

    }

    applicationPromptShown =
        true;

    job.showApplicationPrompt =
        true;

    /*
     * If the user was looking at
     * the details page, close it.
     */

    closeJobDetails();

    /*
     * Render the current page.
     */

    renderCurrentPage();

    /*
     * Scroll specifically to
     * the selected card.
     */

    setTimeout(
        function() {

            const card =
                document.querySelector(
                    `[data-job-id="${cssEscape(
                        job.id
                    )}"]`
                );

            if (card) {

                card.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "center"

                });

            }

        },
        200
    );

}

/* =========================================================
   VISIBILITY CHANGE
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    function() {

        if (
            document.visibilityState ===
            "visible"
        ) {

            handleApplicationReturn();

        }

    }
);

/* =========================================================
   WINDOW FOCUS
   ========================================================= */

window.addEventListener(
    "focus",
    function() {

        handleApplicationReturn();

    }
);

/* =========================================================
   FILTER EVENTS
   ========================================================= */

/* APPLICATION — mutually exclusive; exactly one is always ON. */

document
    .querySelectorAll(
        ".application-filter"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    selectedApplication =
                        button.dataset.filter;

                    setActiveFilter(
                        ".application-filter",
                        button
                    );

                    renderJobs();

                }
            );

        }
    );

/* =========================================================
   MULTI-SELECT FILTER HELPER
   ========================================================= */

function updateMultiFilter(
    selector,
    currentSelection,
    clickedValue,
    allValues,
    allowNone
) {

    let selection =
        Array.isArray(currentSelection)
            ? [...currentSelection]
            : ["All"];

    /* ALL means everything and is visually exclusive. */
    if (clickedValue === "All") {

        selection = ["All"];

    }

    else {

        /* First individual selection turns ALL off. */
        selection = selection.filter(
            function(value) {
                return value !== "All";
            }
        );

        const index =
            selection.indexOf(clickedValue);

        if (index >= 0) {

            selection.splice(
                index,
                1
            );

        }
        else {

            selection.push(
                clickedValue
            );

        }

        /*
         * For non-result groups, at least one option must remain.
         * If all individual options are selected, collapse the
         * visual state back to ALL.
         */
        if (
            !allowNone &&
            selection.length === 0
        ) {

            selection = ["All"];

        }

        if (
            selection.length ===
            allValues.length
        ) {

            selection = ["All"];

        }

    }

    setActiveFilterValues(
        selector,
        selection
    );

    return selection;

}

/* =========================================================
   WORK TYPE — multi-select, minimum one functionally active
   ========================================================= */

document
    .querySelectorAll(
        ".work-type-filter"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    selectedWorkType =
                        updateMultiFilter(
                            ".work-type-filter",
                            selectedWorkType,
                            button.dataset.filter,
                            [
                                "Remote",
                                "Hybrid",
                                "On-site"
                            ],
                            false
                        );

                    renderJobs();

                }
            );

        }
    );

/* =========================================================
   RESULT — multi-select, default ALL, and may become empty
   ========================================================= */

document
    .querySelectorAll(
        ".result-filter"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    selectedResult =
                        updateMultiFilter(
                            ".result-filter",
                            selectedResult,
                            button.dataset.filter,
                            [
                                "Interview",
                                "Rejected",
                                "I Rejected"
                            ],
                            true
                        );

                    renderJobs();

                }
            );

        }
    );

/* =========================================================
   APPLIED STATUS — multi-select, minimum one
   ========================================================= */

document
    .querySelectorAll(
        ".applied-status-filter"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    selectedAppliedStatus =
                        updateMultiFilter(
                            ".applied-status-filter",
                            selectedAppliedStatus,
                            button.dataset.filter,
                            [
                                "Applied",
                                "Interview",
                                "Rejected"
                            ],
                            false
                        );

                    renderApplied();

                }
            );

        }
    );

/* =========================================================
   APPLIED WORK — multi-select, minimum one
   ========================================================= */

document
    .querySelectorAll(
        ".applied-work-filter"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    selectedAppliedWork =
                        updateMultiFilter(
                            ".applied-work-filter",
                            selectedAppliedWork,
                            button.dataset.filter,
                            [
                                "Remote",
                                "Hybrid",
                                "On-site"
                            ],
                            false
                        );

                    renderApplied();

                }
            );

        }
    );

/* =========================================================
   PROGRESS STATUS — multi-select, minimum one
   ========================================================= */

document
    .querySelectorAll(
        ".progress-status-filter"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    selectedProgressStatus =
                        updateMultiFilter(
                            ".progress-status-filter",
                            selectedProgressStatus,
                            button.dataset.filter,
                            [
                                "Applied",
                                "Interview",
                                "Rejected",
                                "I Rejected"
                            ],
                            false
                        );

                    renderProgress();

                }
            );

        }
    );

/* =========================================================
   PROGRESS WORK — multi-select, minimum one
   ========================================================= */

document
    .querySelectorAll(
        ".progress-work-filter"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    selectedProgressWork =
                        updateMultiFilter(
                            ".progress-work-filter",
                            selectedProgressWork,
                            button.dataset.filter,
                            [
                                "Remote",
                                "Hybrid",
                                "On-site"
                            ],
                            false
                        );

                    renderProgress();

                }
            );

        }
    );

/* =========================================================
   FILTER VISUAL STATE
   ========================================================= */

function setActiveFilterValues(
    selector,
    selectedValues
) {

    const allSelected =
        selectedValues.includes("All");

    document
        .querySelectorAll(
            selector
        )
        .forEach(
            function(button) {

                const value =
                    button.dataset.filter;

                button.classList.toggle(
                    "active",
                    allSelected ||
                    selectedValues.includes(value)
                );

            }
        );

}

/* Initial visual state: ALL means every option is ON. */
setActiveFilterValues(
    ".work-type-filter",
    selectedWorkType
);

setActiveFilterValues(
    ".result-filter",
    selectedResult
);

/* =========================================================
   LEGACY SINGLE-FILTER HELPER
   ========================================================= */

function setActiveFilter(
    selector,
    activeButton
) {

    document
        .querySelectorAll(
            selector
        )
        .forEach(
            function(button) {

                button.classList.toggle(
                    "active",
                    button === activeButton
                );

            }
        );

}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}

/* =========================================================
   ESCAPE ATTRIBUTE
   ========================================================= */

function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );

}

/* =========================================================
   CSS ESCAPE
   ========================================================= */

function cssEscape(
    value
) {

    if (
        window.CSS &&
        CSS.escape
    ) {

        return CSS.escape(
            value
        );

    }

    return String(
        value
    )
    .replace(
        /([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,
        "\\$1"
    );

}

/* =========================================================
   INITIAL STATE
   ========================================================= */

/* =========================================================
   RESTORE SAME-TAB SESSION ON REFRESH
   ========================================================= */

async function restoreSession() {

    if (!dashboard || !loginScreen) {
        return;
    }

    dashboard.classList.add(
        "hidden"
    );

    const savedUser =
        sessionStorage.getItem(
            SESSION_KEY
        );

    const savedToken =
        getAuthToken();

    if (
        !savedUser ||
        !savedToken
    ) {

        clearSession();

        loginScreen.classList.remove(
            "hidden"
        );

        return;

    }

    const savedPage =
        sessionStorage.getItem(
            PAGE_KEY
        );

    if (savedPage) {
        currentPage = savedPage;
    }

    loggedInName.textContent =
        savedUser;

    updateHeaderGreeting();

    loginScreen.classList.add(
        "hidden"
    );

    dashboard.classList.remove(
        "hidden"
    );

    navButtons.forEach(
        function(button) {

            button.classList.toggle(
                "active",
                button.dataset.page ===
                currentPage
            );

        }
    );

    pages.forEach(
        function(page) {

            page.classList.toggle(
                "active-page",
                page.id ===
                currentPage + "Page"
            );

        }
    );

    await loadJobs();

}

restoreSession();


/* Keep the displayed calendar date current while the page remains open. */
updateHeaderGreeting();
setInterval(updateHeaderGreeting, 60000);


/* Keep greeting/date current while the page remains open. */
setInterval(
    updateEdithGreeting,
    60000
);

updateHeaderGreeting();
