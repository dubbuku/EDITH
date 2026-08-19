
/* =========================================================
   EDITH JOB TRACKER
   ========================================================= */

/* =========================================================
   GOOGLE APPS SCRIPT URL
   ========================================================= */

const API_URL =
    "https://script.google.com/macros/s/AKfycbz2OdRwVbESI647sS001Y5Sxr1Eto4-cEoEktxeCOeLSx9izz4ewkNDWP5N0N81XR9N/exec";

/* =========================================================
   LOGIN
   ========================================================= */

const users = {

    atchaya: "kadavuchol",

    karthick: "summa"

};

/* =========================================================
   APPLICATION STATE
   ========================================================= */

let jobs = [];

let currentPage = "today";

let currentDetailsJob = null;

let pendingApplicationJob = null;

let applicationWaitingForReturn = false;

let applicationPromptShown = false;

/* =========================================================
   FILTER STATE
   ========================================================= */

let selectedApplication = "All";

let selectedWorkType = "All";

let selectedResult = "All";

let selectedAppliedStatus = [
    "Pending",
    "Interview",
    "Rejected"
];

let selectedAppliedWork = "All";

let selectedProgressStatus = "All";

let selectedProgressWork = "All";

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

const loginScreen =
    document.getElementById("loginScreen");

const dashboard =
    document.getElementById("dashboard");

const loggedInName =
    document.getElementById("loggedInName");

const todayGreeting =
    document.getElementById("todayGreeting");

const todayDate =
    document.getElementById("todayDate");

const logoutButton =
    document.getElementById("logoutButton");

const globalSearch =
    document.getElementById("globalSearch");

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
     * PENDING / NORMAL APPLIED
     *
     * Code.gs sets Result to "Pending" when an
     * application is first recorded. Older rows may
     * still have a blank Result, so both are treated
     * as Pending in the website.
     */

    else if (
        result.toLowerCase() === "" ||
        result.toLowerCase() === "pending"
    ) {

        status = "Pending";

    }

    /*
     * FALLBACK
     */

    else {

        status = result || "Pending";

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

    const token =
        sessionStorage.getItem(
            "edithWebToken"
        );

    if (!token) {

        showLoginState(
            "Your website session has ended. Please log in again."
        );

        return;

    }

    try {

        const response =
            await fetch(
                API_URL +
                "?token=" +
                encodeURIComponent(token),
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

            if (
                data.error ===
                "AUTH_REQUIRED"
            ) {

                sessionStorage.removeItem(
                    "edithWebToken"
                );

                sessionStorage.removeItem(
                    "edithDisplayName"
                );

                showLoginState(
                    "Your website session has expired. Please log in again."
                );

                return;

            }

            throw new Error(
                data.error ||
                "Unable to load jobs."
            );

        }

        if (!Array.isArray(data.jobs)) {

            throw new Error(
                "Invalid jobs response from EDITH."
            );

        }

        jobs =
            data.jobs.map(
                normalizeJob
            );

        renderTodayHeader();

        renderCurrentPage();

    }

    catch (error) {

        console.error(
            "EDITH ERROR:",
            error
        );

        /*
         * Do not call this a connection error when
         * the backend explicitly reports AUTH_REQUIRED.
         */

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

    try {

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

        Object.keys(
            updates
        ).forEach(
            function(key) {

                params.set(
                    key,
                    String(
                        updates[key]
                    )
                );

            }
        );

        const token =
            sessionStorage.getItem(
                "edithWebToken"
            );

        if (!token) {

            showLoginState(
                "Your website session has ended. Please log in again."
            );

            return false;

        }

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

        await loadJobs();

        /*
         * Refresh details page if it is open.
         */

        if (currentDetailsJob) {

            const updated =
                jobs.find(
                    function(item) {

                        return (
                            item.id ===
                            currentDetailsJob.id
                        );

                    }
                );

            if (updated) {

                currentDetailsJob =
                    updated;

                renderJobDetails(
                    updated
                );

            }

        }

        return true;

    }

    catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );

        alert(
            "EDITH could not save this change."
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

        if (!username || !password) {
            loginError.textContent =
                "Please enter your username and password.";
            return;
        }

        setLoginLoading(
            true
        );

        try {

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

            params.set(
                "client",
                "web"
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
                    "Incorrect username or password."
                );

            }

            /*
             * sessionStorage is intentionally used for Web.
             * Each browser tab gets its own token.
             * A new tab/login therefore gets a separate
             * Web token and cannot overwrite another tab's
             * session.
             */

            sessionStorage.setItem(
                "edithWebToken",
                data.token
            );

            sessionStorage.setItem(
                "edithDisplayName",
                data.displayName ||
                username
            );

            loggedInName.textContent =
                data.displayName ||
                username;

            loginScreen.classList.add(
                "hidden"
            );

            dashboard.classList.remove(
                "hidden"
            );

            await loadJobs();

        }

        catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );

            loginError.textContent =
                error.message ||
                "Unable to connect to EDITH.";

            setLoginLoading(
                false
            );

        }

    }
);

function setLoginLoading(
    loading
) {

    const button =
        loginForm.querySelector(
            ".login-button"
        );

    if (!button) {
        return;
    }

    button.disabled =
        loading;

    if (loading) {

        button.innerHTML = `
            <span class="login-spinner"></span>
        `;

    }

    else {

        button.textContent =
            "LOG IN";

    }

}

function showLoginState(
    message
) {

    dashboard.classList.add(
        "hidden"
    );

    loginScreen.classList.remove(
        "hidden"
    );

    loginError.textContent =
        message || "";

    setLoginLoading(
        false
    );

    usernameInput.focus();

}

function renderTodayHeader() {

    const displayName =
        sessionStorage.getItem(
            "edithDisplayName"
        ) ||
        loggedInName.textContent ||
        "there";

    const now =
        new Date();

    const hour =
        now.getHours();

    let greeting =
        "Good evening";

    if (hour < 12) {
        greeting =
            "Good morning";
    }
    else if (hour < 18) {
        greeting =
            "Good afternoon";
    }

    if (todayGreeting) {

        todayGreeting.textContent =
            greeting +
            ", " +
            displayName +
            ".";

    }

    if (todayDate) {

        todayDate.textContent =
            now.toLocaleDateString(
                undefined,
                {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                }
            );

    }

}

/* =========================================================
   LOGOUT
   ========================================================= */

logoutButton.addEventListener(
    "click",
    async function() {

        const token =
            sessionStorage.getItem(
                "edithWebToken"
            );

        /*
         * Ask Code.gs to invalidate this Web token.
         * iOS tokens are independent, so this cannot
         * invalidate an iOS session.
         */

        if (token) {

            try {

                await fetch(
                    API_URL +
                    "?action=logout&token=" +
                    encodeURIComponent(
                        token
                    ),
                    {
                        method: "GET",
                        cache: "no-store"
                    }
                );

            }

            catch (error) {

                console.warn(
                    "EDITH logout request failed:",
                    error
                );

            }

        }

        sessionStorage.removeItem(
            "edithWebToken"
        );

        sessionStorage.removeItem(
            "edithDisplayName"
        );

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

        dashboard.classList.add(
            "hidden"
        );

        loginScreen.classList.remove(
            "hidden"
        );

        usernameInput.value =
            "";

        passwordInput.value =
            "";

        loginError.textContent =
            "";

        setLoginLoading(
            false
        );

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

    if (todayJobCount) {

        todayJobCount.textContent =
            addedToday.length;

    }

    renderGrid(
        todayJobGrid,
        addedToday
    );

    /*
     * The current website layout does not contain a
     * second "current opportunity" section. Keep this
     * rendering defensive so a missing optional element
     * can never crash the Today page.
     */

    if (currentOpportunityGrid) {

        renderGrid(
            currentOpportunityGrid,
            currentToApply
        );

    }

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

                    if (
                        !job.applied ||
                        job.userRejected
                    ) {

                        return false;

                    }

                }

                /*
                 * WORK TYPE
                 */

                if (
                    selectedWorkType !==
                    "All"
                ) {

                    if (
                        job.workType !==
                        selectedWorkType
                    ) {

                        return false;

                    }

                }

                /*
                 * RESULT
                 */

                if (
                    selectedResult !==
                    "All"
                ) {

                    if (
                        selectedResult ===
                        "Interview" &&
                        job.status !==
                        "Interview"
                    ) {

                        return false;

                    }

                    if (
                        selectedResult ===
                        "Rejected" &&
                        job.status !==
                        "Rejected"
                    ) {

                        return false;

                    }

                    if (
                        selectedResult ===
                        "I Rejected" &&
                        !job.userRejected
                    ) {

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

    const showAll =
        selectedAppliedStatus.includes(
            "All"
        );

    const filtered =
        jobs.filter(
            function(job) {

                /*
                 * Applied page only contains jobs that
                 * have actually been applied for.
                 *
                 * I Rejected remains eligible when it is
                 * also an applied job.
                 */

                if (!job.applied) {

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

                /*
                 * ALL = every applied job, including
                 * jobs personally rejected by the user.
                 */

                if (showAll) {

                    if (
                        selectedAppliedWork !==
                        "All"
                    ) {

                        return (
                            job.workType ===
                            selectedAppliedWork
                        );

                    }

                    return true;

                }

                /*
                 * Multiple status selection.
                 */

                if (
                    !selectedAppliedStatus.includes(
                        job.status
                    )
                ) {

                    return false;

                }

                if (
                    selectedAppliedWork !==
                    "All"
                ) {

                    if (
                        job.workType !==
                        selectedAppliedWork
                    ) {

                        return false;

                    }

                }

                return true;

            }
        );

    if (appliedCount) {

        appliedCount.textContent =
            filtered.length;

    }

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

                /*
                 * Progress is for actual applications.
                 * I Rejected is kept as a separate state
                 * when selected.
                 */

                if (!job.applied) {

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
                    selectedProgressStatus !==
                    "All"
                ) {

                    if (
                        job.status !==
                        selectedProgressStatus
                    ) {

                        return false;

                    }

                }

                if (
                    selectedProgressWork !==
                    "All"
                ) {

                    if (
                        job.workType !==
                        selectedProgressWork
                    ) {

                        return false;

                    }

                }

                return true;

            }
        );

    if (progressCount) {

        progressCount.textContent =
            filtered.length;

    }

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

                        pendingApplicationJob =
                            null;

                        applicationWaitingForReturn =
                            false;

                        applicationPromptShown =
                            false;

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
   CLOSE DETAILS
   ========================================================= */

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

                await updateJob(
                    job.id,
                    {
                        userRejected: true
                    }
                );

                closeJobDetails();

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

/* APPLICATION */

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

/* WORK TYPE */

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
                        button.dataset.filter;

                    setActiveFilter(
                        ".work-type-filter",
                        button
                    );

                    renderJobs();

                }
            );

        }
    );

/* RESULT */

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
                        button.dataset.filter;

                    setActiveFilter(
                        ".result-filter",
                        button
                    );

                    renderJobs();

                }
            );

        }
    );

/* APPLIED STATUS */

document
    .querySelectorAll(
        ".applied-status-filter"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    const value =
                        button.dataset.filter;

                    /*
                     * ALL is exclusive.
                     */

                    if (
                        value ===
                        "All"
                    ) {

                        selectedAppliedStatus =
                            ["All"];

                    }

                    else {

                        /*
                         * Remove ALL as soon as an
                         * individual status is chosen.
                         */

                        selectedAppliedStatus =
                            selectedAppliedStatus.filter(
                                function(status) {
                                    return status !== "All";
                                }
                            );

                        if (
                            selectedAppliedStatus.includes(
                                value
                            )
                        ) {

                            selectedAppliedStatus =
                                selectedAppliedStatus.filter(
                                    function(status) {
                                        return status !== value;
                                    }
                                );

                        }

                        else {

                            selectedAppliedStatus.push(
                                value
                            );

                        }

                        /*
                         * If the user turns every
                         * individual filter off,
                         * return to ALL.
                         */

                        if (
                            selectedAppliedStatus.length ===
                            0
                        ) {

                            selectedAppliedStatus =
                                ["All"];

                        }

                    }

                    updateAppliedStatusButtons();

                    renderApplied();

                }
            );

        }
    );

function updateAppliedStatusButtons() {

    document
        .querySelectorAll(
            ".applied-status-filter"
        )
        .forEach(
            function(button) {

                const value =
                    button.dataset.filter;

                button.classList.toggle(
                    "active",
                    selectedAppliedStatus.includes(
                        value
                    )
                );

            }
        );

}

updateAppliedStatusButtons();

/* APPLIED WORK */

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
                        button.dataset.filter;

                    setActiveFilter(
                        ".applied-work-filter",
                        button
                    );

                    renderApplied();

                }
            );

        }
    );

/* PROGRESS STATUS */

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
                        button.dataset.filter;

                    setActiveFilter(
                        ".progress-status-filter",
                        button
                    );

                    renderProgress();

                }
            );

        }
    );

/* PROGRESS WORK */

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
                        button.dataset.filter;

                    setActiveFilter(
                        ".progress-work-filter",
                        button
                    );

                    renderProgress();

                }
            );

        }
    );

/* =========================================================
   ACTIVE FILTER
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
                    button ===
                    activeButton
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

if (
    dashboard &&
    loginScreen
) {

    dashboard.classList.add(
        "hidden"
    );

    const savedToken =
        sessionStorage.getItem(
            "edithWebToken"
        );

    const savedDisplayName =
        sessionStorage.getItem(
            "edithDisplayName"
        );

    if (
        savedToken &&
        savedDisplayName
    ) {

        loggedInName.textContent =
            savedDisplayName;

        loginScreen.classList.add(
            "hidden"
        );

        dashboard.classList.remove(
            "hidden"
        );

        renderTodayHeader();

        loadJobs();

    }

}
