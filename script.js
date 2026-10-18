/* =========================================================
   ATTENDANCE DESK
   Frontend: HTML, CSS, JavaScript
   Backend: Java Spring Boot
   Database: MySQL
   ========================================================= */

const API_BASE_URL = "http://localhost:8080/api";

let students = [];
let classes = [];
let attendanceRecords = [];
let subjects = [];
let currentAttendance = {};
let editingSubjectId = null;
let editingStudentId = null;

let currentUser = {
    username: "admin",
    name: "Administrator",
    role: "Administrator",
    email: "admin@attendancedesk.com",
    phone: ""
};

const SETTINGS_KEY = "attendanceDeskSettings";
const SESSION_KEY = "attendanceDeskUser";

const DEFAULT_SETTINGS = {
    theme: "light",
    notifications: true,
    itemsPerPage: 10
};

/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getStudentId(student) {
    return student?.studentId ?? student?.student_id ?? student?.id;
}

function getRoll(student) {
    return student?.rollNumber ??
        student?.roll_number ??
        student?.roll ?? "";
}

function getStudentName(student) {
    return student?.studentName ??
        student?.student_name ??
        student?.name ?? "";
}

function getClassId(student) {
    return student?.classId ?? student?.class_id ?? null;
}

function getTodayDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(value) {
    if (!value) return "-";

    const text = String(value);
    const datePart = text.match(/^\d{4}-\d{2}-\d{2}/);

    if (datePart) {
        const [year, month, day] = datePart[0].split("-");
        return `${day}-${month}-${year}`;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return text;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...options.headers
        }
    });

    if (!response.ok) {
        let message = `HTTP ${response.status}`;

        try {
            const body = await response.json();
            message = body.message || body.error || message;
        } catch {
            try {
                message = (await response.text()) || message;
            } catch {}
        }

        throw new Error(message);
    }

    if (response.status === 204) return null;

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}


function showToast(title, message, type = "info") {
    const container = document.getElementById("toastContainer");

    if (!container) {
        console.log(`[${type}] ${title}: ${message}`);
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
        <span class="toast-icon">
            ${type === "success" ? "✓" : type === "error" ? "!" : "i"}
        </span>
        <div>
            <strong>${escapeHTML(title)}</strong>
            <p>${escapeHTML(message)}</p>
        </div>
        <button type="button" aria-label="Close notification">×</button>
    `;

    container.appendChild(toast);

    // CSS ki .toast.show styling activate karo
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    const closeButton = toast.querySelector("button");

    closeButton.addEventListener("click", () => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
        if (toast.isConnected) {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }
    }, 3500);
}


function updateDate() {
    const now = new Date();

    const formatted = now.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    if ($("currentDate")) $("currentDate").textContent = formatted;
    if ($("dashboardDate")) $("dashboardDate").textContent = formatted;
}

function setDefaultDates() {
    [
        "attendanceDate",
        "recordStartDate",
        "recordEndDate",
        "recordFromDate",
        "recordToDate",
        "reportStartDate",
        "reportEndDate"
    ].forEach(id => {
        const element = $(id);

        if (element && !element.value) {
            element.value = getTodayDate();
        }
    });
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
    setupLogin();
    setupNavigation();
    setupStudents();
    setupSubjects();
    setupAttendance();
    setupRecords();
    setupReports();
    setupProfile();
    setupSettings();
    setupLogout();
    setupMobileMenu();
    setupGlobalEvents();

    updateDate();
    setDefaultDates();
    loadSettings();
    loadSavedSession();

    await loadClassesFromDatabase();
    await loadSubjectsFromDatabase();
    await loadStudentsFromDatabase();
    await loadAttendanceFromDatabase();

    populateRecordSubjectDropdown();
    renderStudents();
    renderDashboard();
    renderRecords();
    renderReports();
    updateProfileStats();
}

/* =========================================================
   CLASSES
   ========================================================= */

async function loadClassesFromDatabase() {
    try {
        const data = await apiRequest("/classes");

        classes = Array.isArray(data)
            ? data.map(item => ({
                classId: item.classId ?? item.class_id ?? item.id,
                className: item.className ??
                    item.class_name ?? item.name ?? "",
                division: item.division ?? item.section ?? ""
            }))
            : [];

        populateClassDropdowns();
        populateAttendanceSubjectDropdown();
        console.log("Classes:", classes);
    } catch (error) {
        console.error("Load classes:", error);

        classes = [];
        populateClassDropdowns();
        populateAttendanceSubjectDropdown();

        showToast(
            "Database Error",
            "Classes could not be loaded.",
            "error"
        );
    }
}

function populateClassDropdowns() {
    const dropdownIds = [
        "studentClass",
        "attendanceClass",
        "recordClass",
        "classFilter",
        "reportClass",
        "subjectClassFilter",
        "subjectClassInput"
    ];

    dropdownIds.forEach(id => {
        const select = $(id);
        if (!select) return;

        const previous = select.value;
        const isFilter = ["classFilter", "recordClass", "reportClass", "subjectClassFilter"].includes(id);

        select.innerHTML = "";

        const first = document.createElement("option");
        first.value = isFilter ? "all" : "";
        first.textContent = isFilter ? "All Classes" : "Select Class";
        select.appendChild(first);

        classes.forEach(item => {
            const option = document.createElement("option");
            option.value = String(item.classId);
            option.textContent = item.division
                ? `${item.className} - ${item.division}`
                : item.className;

            select.appendChild(option);
        });

        if ([...select.options].some(option => option.value === previous)) {
            select.value = previous;
        }
    });
}

function getClassNameFromId(classId) {
    const item = classes.find(
        value => String(value.classId) === String(classId)
    );

    if (!item) return "";

    return item.division
        ? `${item.className} - ${item.division}`
        : item.className;
}

/* =========================================================
   SUBJECTS: CRUD AND CLASS-WISE DROPDOWN
   ========================================================= */

function normalizeSubject(item) {
    const classId = item.classId ?? item.class_id ??
        item.schoolClass?.classId ?? item.schoolClass?.class_id ??
        item.schoolClass?.id ?? item.class?.classId ?? item.class?.id ?? null;
    return {
        subjectId: item.subjectId ?? item.subject_id ?? item.id,
        subjectName: item.subjectName ?? item.subject_name ?? item.name ?? "",
        classId,
        className: item.className ?? item.class_name ??
            item.schoolClass?.className ?? item.schoolClass?.class_name ??
            item.class?.className ?? ""
    };
}

async function loadSubjectsFromDatabase() {
    try {
        const data = await apiRequest("/subjects");
        subjects = Array.isArray(data) ? data.map(normalizeSubject) : [];
        renderSubjects();
        populateAttendanceSubjectDropdown();
        attendanceRecords = attendanceRecords.map(record => ({
            ...record,
            subjectName: record.subjectName || getSubjectNameFromId(record.subjectId)
        }));
        renderRecords();
        renderReports();
    } catch (error) {
        console.error("Load subjects:", error);
        subjects = [];
        renderSubjects();
        populateAttendanceSubjectDropdown();
        showToast("Subjects Error", "Subjects could not be loaded from /api/subjects.", "error");
    }
}

function setupSubjects() {
    $("addSubjectBtn")?.addEventListener("click", () => openSubjectModal());
    $("closeSubjectModal")?.addEventListener("click", closeSubjectModal);
    $("cancelSubjectBtn")?.addEventListener("click", closeSubjectModal);
    $("subjectForm")?.addEventListener("submit", saveSubject);
    $("subjectClassFilter")?.addEventListener("change", renderSubjects);
}

function openSubjectModal(subject = null) {
    if (!( $("subjectModal") && $("subjectForm") )) {
        showToast("HTML Missing", "Subject modal is missing from index.html.", "error");
        return;
    }
    $("subjectForm").reset();
    editingSubjectId = subject ? subject.subjectId : null;
    if ($("subjectModalTitle")) $("subjectModalTitle").textContent = subject ? "Edit Subject" : "Add Subject";
    if ($("subjectNameInput")) $("subjectNameInput").value = subject?.subjectName || "";
    if ($("subjectClassInput")) $("subjectClassInput").value = subject?.classId != null ? String(subject.classId) : "";
    if ($("saveSubjectBtn")) $("saveSubjectBtn").textContent = subject ? "Update Subject" : "Save Subject";
    $("subjectModal").classList.remove("hidden");
    $("subjectNameInput")?.focus();
}

function closeSubjectModal() {
    $("subjectModal")?.classList.add("hidden");
    $("subjectForm")?.reset();
    editingSubjectId = null;
    if ($("saveSubjectBtn")) $("saveSubjectBtn").textContent = "Save Subject";
}

async function saveSubject(event) {
    event.preventDefault();
    const subjectName = $("subjectNameInput")?.value.trim() || "";
    const classId = $("subjectClassInput")?.value || "";
    if (!subjectName || !classId) {
        showToast("Missing Information", "Enter subject name and select a class.", "error");
        return;
    }
    const duplicate = subjects.find(item =>
        String(item.classId) === String(classId) &&
        item.subjectName.toLowerCase() === subjectName.toLowerCase() &&
        String(item.subjectId) !== String(editingSubjectId)
    );
    if (duplicate) {
        showToast("Duplicate Subject", "This subject already exists for this class.", "error");
        return;
    }
    const payload = { subjectName, classId: Number(classId) };
    const wasEditing = editingSubjectId !== null;
    const button = $("saveSubjectBtn");
    if (button) button.disabled = true;
    try {
        if (wasEditing) {
            await apiRequest(`/subjects/${encodeURIComponent(editingSubjectId)}`, {
                method: "PUT", body: JSON.stringify(payload)
            });
        } else {
            await apiRequest("/subjects", { method: "POST", body: JSON.stringify(payload) });
        }
        await loadSubjectsFromDatabase();
        closeSubjectModal();
        showToast(wasEditing ? "Subject Updated" : "Subject Added", "Subject saved successfully.", "success");
    } catch (error) {
        console.error("Save subject:", error);
        showToast("Save Failed", `${error.message}. Check your Spring Boot subject API fields.`, "error");
    } finally {
        if (button) button.disabled = false;
    }
}

function renderSubjects() {
    const table = $("subjectsTable");
    if (!table) return;
    const selectedClass = $("subjectClassFilter")?.value || "all";
    let list = [...subjects];
    if (selectedClass !== "all" && selectedClass !== "") {
        list = list.filter(item => String(item.classId) === String(selectedClass));
    }
    if (!list.length) {
        table.innerHTML = `<tr><td colspan="4" class="empty-state">No subjects found. Add a subject for a class.</td></tr>`;
        return;
    }
    table.innerHTML = list.map(item => `
        <tr>
            <td>${escapeHTML(item.subjectName || "-")}</td>
            <td>${escapeHTML(item.className || getClassNameFromId(item.classId) || "-")}</td>
            <td>${escapeHTML(item.subjectId ?? "-")}</td>
            <td><div class="table-actions">
                <button class="btn btn-sm btn-secondary" data-action="edit-subject" data-id="${escapeHTML(item.subjectId)}">Edit</button>
                <button class="btn btn-sm btn-danger" data-action="delete-subject" data-id="${escapeHTML(item.subjectId)}">Delete</button>
            </div></td>
        </tr>`).join("");
}

async function deleteSubject(id) {
    const subject = subjects.find(item => String(item.subjectId) === String(id));
    if (!subject || !confirm(`Delete subject "${subject.subjectName}"? Existing attendance may depend on it.`)) return;
    try {
        await apiRequest(`/subjects/${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadSubjectsFromDatabase();
        await loadAttendanceFromDatabase();
        renderRecords();
        renderReports();
        showToast("Subject Deleted", "Subject deleted successfully.", "success");
    } catch (error) {
        console.error("Delete subject:", error);
        showToast("Delete Failed", `${error.message}. Existing attendance may be using this subject.`, "error");
    }
}

function populateAttendanceSubjectDropdown() {
    const select = $("attendanceSubject");
    if (!select) return;
    const previous = select.value;
    const classId = $("attendanceClass")?.value || "";
    select.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = classId ? "Select Subject" : "Select class first";
    select.appendChild(first);
    const list = classId ? subjects.filter(item => String(item.classId) === String(classId)) : [];
    list.forEach(item => {
        const option = document.createElement("option");
        option.value = String(item.subjectId);
        option.textContent = item.subjectName;
        select.appendChild(option);
    });
    select.disabled = !classId || list.length === 0;
    if (list.some(item => String(item.subjectId) === previous)) select.value = previous;
}

function getSubjectNameFromId(subjectId) {
    const subject = subjects.find(item => String(item.subjectId) === String(subjectId));
    return subject?.subjectName || "";
}

/* =========================================================
   LOGIN AND SESSION
   Demo credentials: admin / admin123
   ========================================================= */

function setupLogin() {
    $("loginForm")?.addEventListener("submit", handleLogin);

    $("forgotPassword")?.addEventListener("click", event => {
        event.preventDefault();

        showToast(
            "Forgot Password",
            "Please contact the administrator to reset your password.",
            "info"
        );
    });
}

function handleLogin(event) {
    event.preventDefault();

    const username = $("loginUsername")?.value.trim() || "";
    const password = $("loginPassword")?.value || "";

    if ($("usernameError")) $("usernameError").textContent = "";
    if ($("passwordError")) $("passwordError").textContent = "";

    if (!username || !password) {
        if (!username && $("usernameError")) {
            $("usernameError").textContent = "Username is required.";
        }

        if (!password && $("passwordError")) {
            $("passwordError").textContent = "Password is required.";
        }

        return;
    }

    // Demo-only login. Not a secure backend authentication system.
    if (username !== "admin" || password !== "admin123") {
        if ($("passwordError")) {
            $("passwordError").textContent =
                "Invalid username or password.";
        }

        showToast(
            "Login Failed",
            "Check your login details.",
            "error"
        );
        return;
    }

    currentUser = {
        username: "admin",
        name: "Administrator",
        role: "Administrator",
        email: "admin@attendancedesk.com",
        phone: ""
    };

    if ($("rememberMe")?.checked) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    }

    showMainApplication();
    showToast("Welcome", "Login successful.", "success");
}

function showMainApplication() {
    $("loginPage")?.classList.add("hidden");
    $("mainApp")?.classList.remove("hidden");

    if ($("topbarUserName")) {
        $("topbarUserName").textContent =
            currentUser.name || "Administrator";
    }

    loadProfile();
}

function loadSavedSession() {
    try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (!saved) return;

        currentUser = JSON.parse(saved);
        showMainApplication();
    } catch {
        localStorage.removeItem(SESSION_KEY);
    }
}

function setupLogout() {
    $("logoutBtn")?.addEventListener("click", () => {
        localStorage.removeItem(SESSION_KEY);

        $("mainApp")?.classList.add("hidden");
        $("loginPage")?.classList.remove("hidden");
        $("loginForm")?.reset();

        showToast(
            "Logged Out",
            "You have been logged out.",
            "success"
        );
    });
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", () => {
            const section = item.dataset.section;
            if (!section) return;

            document.querySelectorAll(".nav-item").forEach(nav => {
                nav.classList.remove("active");
            });

            item.classList.add("active");

            document.querySelectorAll(".content-section").forEach(element => {
                element.classList.remove("active-section");
            });

            $(section)?.classList.add("active-section");
            updatePageHeader(section);

            if (window.innerWidth <= 768) {
                document.querySelector(".sidebar")?.classList.remove("open");
            }

            if (section === "studentsSection") renderStudents();
            if (section === "subjectsSection") renderSubjects();
            if (section === "dashboardSection") renderDashboard();
            if (section === "recordsSection") renderRecords();
            if (section === "reportsSection") renderReports();
        });
    });
}

function updatePageHeader(section) {
    const data = {
        dashboardSection: [
            "Dashboard",
            "Overview of attendance activity"
        ],
        studentsSection: [
            "Students",
            "Manage student records"
        ],
        subjectsSection: [
            "Manage Subjects",
            "Create and manage subjects for each class"
        ],
        attendanceSection: [
            "Mark Attendance",
            "Record daily student attendance"
        ],
        recordsSection: [
            "Attendance Records",
            "View and filter attendance records"
        ],
        reportsSection: [
            "Reports",
            "Attendance reports and analytics"
        ],
        profileSection: [
            "Profile",
            "Manage your profile information"
        ],
        settingsSection: [
            "Settings",
            "Manage application settings"
        ]
    }[section];

    if (!data) return;

    if ($("pageTitle")) $("pageTitle").textContent = data[0];
    if ($("pageSubtitle")) $("pageSubtitle").textContent = data[1];
}

function setupMobileMenu() {
    $("mobileMenuBtn")?.addEventListener("click", () => {
        document.querySelector(".sidebar")?.classList.toggle("open");
    });
}

function openSection(section) {
    const nav = document.querySelector(
        `.nav-item[data-section="${section}"]`
    );

    if (nav) {
        nav.click();
        return;
    }

    document.querySelectorAll(".content-section").forEach(element => {
        element.classList.remove("active-section");
    });

    $(section)?.classList.add("active-section");
    updatePageHeader(section);
}

function setupGlobalEvents() {
    document.addEventListener("click", event => {
        const target = event.target.closest("[data-target]");

        if (target) {
            openSection(target.dataset.target);
        }

        const action = event.target.closest("[data-action]");
        if (!action) return;

        const id = action.dataset.id;
        const type = action.dataset.action;

        if (type === "edit-student") editStudent(id);
        if (type === "edit-subject") {
            const subject = subjects.find(item => String(item.subjectId) === String(id));
            if (subject) openSubjectModal(subject);
        }
        if (type === "delete-subject") deleteSubject(id);
        if (type === "delete-student") deleteStudent(id);
        if (type === "mark-present") markStudent(id, "Present");
        if (type === "mark-absent") markStudent(id, "Absent");
    });
}
/* =========================================================
   STUDENTS: LOAD FROM DATABASE
   ========================================================= */

async function loadStudentsFromDatabase() {
    try {
        const data = await apiRequest("/students");

        students = Array.isArray(data)
            ? data.map(student => {
                const classId = getClassId(student);

                return {
                    id: getStudentId(student),
                    roll: getRoll(student),
                    name: getStudentName(student),
                    email: student.email || "",
                    phone: student.phone || "",
                    classId,
                    className:
                        student.className ??
                        student.class_name ??
                        getClassNameFromId(classId)
                };
            })
            : [];

        console.log("Students loaded:", students);
    } catch (error) {
        console.error("Load students:", error);
        students = [];

        showToast(
            "Database Error",
            "Students could not be loaded. Check the backend.",
            "error"
        );
    }
}

/* =========================================================
   STUDENTS: UI AND CRUD
   ========================================================= */

function setupStudents() {
    $("addStudentBtn")?.addEventListener("click", openStudentModal);
    $("closeStudentModal")?.addEventListener("click", closeStudentModal);
    $("cancelStudentBtn")?.addEventListener("click", closeStudentModal);
    $("studentForm")?.addEventListener("submit", saveStudent);
    $("studentSearch")?.addEventListener("input", renderStudents);
    $("classFilter")?.addEventListener("change", renderStudents);
}

function openStudentModal() {
    $("studentModal")?.classList.remove("hidden");
    $("studentRoll")?.focus();
}

function closeStudentModal() {
    $("studentModal")?.classList.add("hidden");
    $("studentForm")?.reset();

    editingStudentId = null;

    const submit = $("studentForm")?.querySelector('[type="submit"]');
    if (submit) submit.textContent = "Save Student";
}

async function saveStudent(event) {
    event.preventDefault();

    const roll = $("studentRoll")?.value.trim() || "";
    const name = $("studentName")?.value.trim() || "";
    const email = $("studentEmail")?.value.trim() || "";
    const phone = $("studentPhone")?.value.trim() || "";
    const classId = $("studentClass")?.value || "";

    if (!roll || !name || !classId) {
        showToast("Missing Information", "Fill all required fields.", "error");
        return;
    }

    const duplicate = students.find(student =>
        String(student.roll).toLowerCase() === roll.toLowerCase() &&
        String(student.id) !== String(editingStudentId)
    );

    if (duplicate) {
        showToast(
            "Duplicate Roll Number",
            "This roll number already exists.",
            "error"
        );
        return;
    }

    const payload = {
        rollNumber: roll,
        studentName: name,
        email: email || null,
        phone: phone || null,
        classId: Number(classId)
    };

    const wasEditing = editingStudentId !== null;

    try {
        if (wasEditing) {
            await apiRequest(
                `/students/${encodeURIComponent(editingStudentId)}`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }
            );
        } else {
            await apiRequest("/students", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        await loadStudentsFromDatabase();

        renderStudents();
        loadAttendanceStudentsIfVisible();
        renderDashboard();
        closeStudentModal();

        showToast(
            wasEditing ? "Student Updated" : "Student Added",
            wasEditing
                ? "Student record updated."
                : "Student saved successfully.",
            "success"
        );
    } catch (error) {
        console.error("Save student:", error);

        showToast(
            "Save Failed",
            `${error.message}. Check the student API endpoint.`,
            "error"
        );
    }
}

function renderStudents() {
    const table = $("studentsTable");
    if (!table) return;

    const search = $("studentSearch")?.value.trim().toLowerCase() || "";
    const selectedClass = $("classFilter")?.value || "all";

    let list = [...students];

    if (search) {
        list = list.filter(student =>
            String(student.roll).toLowerCase().includes(search) ||
            String(student.name).toLowerCase().includes(search) ||
            String(student.email).toLowerCase().includes(search) ||
            String(student.phone).toLowerCase().includes(search)
        );
    }

    if (selectedClass !== "all" && selectedClass !== "") {
        list = list.filter(
            student => String(student.classId) === String(selectedClass)
        );
    }

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">No students found.</td>
            </tr>
        `;
        return;
    }

    table.innerHTML = list.map(student => `
        <tr>
            <td>${escapeHTML(student.roll || "-")}</td>
            <td><strong>${escapeHTML(student.name || "-")}</strong></td>
            <td>${escapeHTML(student.email || "-")}</td>
            <td>${escapeHTML(
                student.className ||
                getClassNameFromId(student.classId) ||
                "-"
            )}</td>
            <td>${escapeHTML(student.phone || "-")}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-secondary"
                        data-action="edit-student"
                        data-id="${escapeHTML(student.id)}">Edit</button>

                    <button class="btn btn-sm btn-danger"
                        data-action="delete-student"
                        data-id="${escapeHTML(student.id)}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function editStudent(id) {
    const student = students.find(
        item => String(item.id) === String(id)
    );

    if (!student) {
        showToast("Not Found", "Student record was not found.", "error");
        return;
    }

    editingStudentId = student.id;

    if ($("studentRoll")) $("studentRoll").value = student.roll;
    if ($("studentName")) $("studentName").value = student.name;
    if ($("studentEmail")) $("studentEmail").value = student.email;
    if ($("studentPhone")) $("studentPhone").value = student.phone;
    if ($("studentClass")) $("studentClass").value = String(student.classId);

    const submit = $("studentForm")?.querySelector('[type="submit"]');
    if (submit) submit.textContent = "Update Student";

    openStudentModal();
}

async function deleteStudent(id) {
    const student = students.find(
        item => String(item.id) === String(id)
    );

    if (!student) return;

    if (!confirm(`Permanently delete ${student.name} from the database?`)) {
        return;
    }

    try {
        await apiRequest(`/students/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        await loadStudentsFromDatabase();
        await loadAttendanceFromDatabase();

        renderStudents();
        renderDashboard();
        renderRecords();
        renderReports();

        showToast("Deleted", "Student deleted from the database.", "success");
    } catch (error) {
        console.error("Delete student:", error);

        showToast(
            "Delete Failed",
            `${error.message}. Check the backend delete route.`,
            "error"
        );
    }
}

/* =========================================================
   ATTENDANCE: LOAD RECORDS
   ========================================================= */

async function loadAttendanceFromDatabase() {
    try {
        const data = await apiRequest("/attendance");

        attendanceRecords = Array.isArray(data)
            ? data.map(record => ({
                id: record.attendanceId ??
                    record.attendance_id ?? record.id,
                studentId: record.studentId ?? record.student_id,
                subjectId: record.subjectId ??
                    record.subject_id ?? null,
                date: record.attendanceDate ??
                    record.attendance_date ?? record.date,
                status: normalizeStatus(record.status),
                studentName: record.studentName ??
                    record.student_name ?? "",
                roll: record.rollNumber ??
                    record.roll_number ?? "",
                classId: record.classId ?? record.class_id,
                subjectName: record.subjectName ?? record.subject_name ?? ""
            }))
            : [];

        attendanceRecords = attendanceRecords.map(record => ({
            ...record,
            subjectName: record.subjectName || getSubjectNameFromId(record.subjectId)
        }));
        console.log("Attendance records:", attendanceRecords);
    } catch (error) {
        console.error("Attendance loading:", error);
        attendanceRecords = [];

        showToast(
            "Attendance Error",
            "Attendance records could not be loaded from the backend.",
            "error"
        );
    }
}

function normalizeStatus(status) {
    const value = String(status || "").toLowerCase();
        if (value === "present" || value === "p") return "Present";
    if (value === "absent" || value === "a") return "Absent";
    if (value === "late") return "Late";

    return "Not Marked";
}

/* =========================================================
   ATTENDANCE: MARK AND SAVE
   ========================================================= */

function setupAttendance() {
    $("loadStudentsBtn")?.addEventListener("click", loadAttendanceStudents);
    $("markAllPresent")?.addEventListener("click", () => markAll("Present"));
    $("markAllAbsent")?.addEventListener("click", () => markAll("Absent"));
    $("saveAttendanceBtn")?.addEventListener("click", saveAttendance);

    $("attendanceClass")?.addEventListener("change", () => {
        populateAttendanceSubjectDropdown();
        const table = $("attendanceTable");
        if (table) table.innerHTML = "";
        currentAttendance = {};
    });

    ["attendanceDate", "attendanceSubject"].forEach(id => {
        $(id)?.addEventListener("change", () => {
            const table = $("attendanceTable");
            if (table) table.innerHTML = "";
            currentAttendance = {};
        });
    });
}

function loadAttendanceStudents() {
    const classId = $("attendanceClass")?.value || "";
    const date = $("attendanceDate")?.value || getTodayDate();
    const selectedSubject = $("attendanceSubject")?.value || "";
    const subjectId = selectedSubject ? String(selectedSubject) : "";

    if (!classId) {
        showToast("Select Class", "Choose a class first.", "error");
        return;
    }

    if (!selectedSubject) {
        showToast("Select Subject", "Choose a subject first.", "error");
        return;
    }

    const list = students.filter(
        student => String(student.classId) === String(classId)
    );

    currentAttendance = {};

    list.forEach(student => {
        const existing = attendanceRecords.find(record =>
            String(record.studentId) === String(student.id) &&
            String(record.date).slice(0, 10) === date &&
            String(record.subjectId ?? "") === subjectId
        );

        currentAttendance[student.id] =
            existing?.status === "Present" || existing?.status === "Absent"
                ? existing.status
                : "";
    });

    renderAttendanceStudents(list);

    if (!list.length) {
        showToast("No Students", "No students found for this class.", "info");
    }
}

function loadAttendanceStudentsIfVisible() {
    const section = $("attendanceSection");
    if (section?.classList.contains("active-section")) {
        loadAttendanceStudents();
    }
}


function renderAttendanceStudents(list) {
    const table = $("attendanceTable");
    if (!table) return;

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="attendance-empty">
                    No students found for this class.
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = list.map((student, index) => {
        const status = currentAttendance[student.id] || "";

        const statusClass =
            status === "Present" ? "status-present" :
            status === "Absent" ? "status-absent" :
            "status-unmarked";

        return `
            <tr>
                <td>${index + 1}</td>

                <td>${escapeHTML(student.roll || "-")}</td>

                <td class="student-name">
                    ${escapeHTML(student.name || "-")}
                </td>

                <td>
                    ${escapeHTML(
                        student.className ||
                        getClassNameFromId(student.classId) ||
                        "-"
                    )}
                </td>

                <td>
                    <select
                        class="attendance-status ${statusClass}"
                        data-student-id="${escapeHTML(student.id)}"
                        aria-label="Attendance status for ${escapeHTML(student.name)}"
                    >
                        <option value="" ${!status ? "selected" : ""}>
                            Select Status
                        </option>

                        <option value="Present" ${
                            status === "Present" ? "selected" : ""
                        }>
                            Present
                        </option>

                        <option value="Absent" ${
                            status === "Absent" ? "selected" : ""
                        }>
                            Absent
                        </option>
                    </select>
                </td>
            </tr>
        `;
    }).join("");

    table.querySelectorAll(".attendance-status").forEach(select => {
        select.addEventListener("change", () => {
            const studentId = select.dataset.studentId;

            currentAttendance[studentId] = select.value;

            select.classList.remove(
                "status-present",
                "status-absent",
                "status-unmarked"
            );

            if (select.value === "Present") {
                select.classList.add("status-present");
            } else if (select.value === "Absent") {
                select.classList.add("status-absent");
            } else {
                select.classList.add("status-unmarked");
            }
        });
    });
}


function markStudent(id, status) {
    currentAttendance[id] = status;

    const select = document.querySelector(
        `.attendance-status[data-student-id="${CSS.escape(String(id))}"]`
    );

    if (select) select.value = status;
}

function markAll(status) {
    document.querySelectorAll(".attendance-status").forEach(select => {
        select.value = status;
        currentAttendance[select.dataset.studentId] = status;
    });
}

async function saveAttendance() {
    const classId = $("attendanceClass")?.value || "";
    const date = $("attendanceDate")?.value || getTodayDate();

    if (!classId) {
        showToast("Select Class", "Choose a class first.", "error");
        return;
    }

    const selectedSubject = $("attendanceSubject")?.value || "";
    if (!selectedSubject) {
        showToast("Select Subject", "Choose a subject before saving attendance.", "error");
        return;
    }

    const classStudents = students.filter(
        student => String(student.classId) === String(classId)
    );

    if (!classStudents.length) {
        showToast(
            "No Students",
            "Load a class with students first.",
            "error"
        );
        return;
    }

    const unmarked = classStudents.filter(
        student => !currentAttendance[student.id]
    );

    if (unmarked.length) {
        showToast(
            "Incomplete Attendance",
            `${unmarked.length} student(s) have not been marked.`,
            "error"
        );
        return;
    }

    const button = $("saveAttendanceBtn");
    if (button) button.disabled = true;

    try {
        for (const student of classStudents) {
            const subjectId = Number(selectedSubject);

            const existing = attendanceRecords.find(record =>
                String(record.studentId) === String(student.id) &&
                String(record.date).slice(0, 10) === date &&
                String(record.subjectId ?? "") === String(subjectId ?? "")
            );

            const payload = {
                studentId: Number(student.id),
                subjectId,
                attendanceDate: date,
                status: currentAttendance[student.id]
            };

            if (existing?.id) {
                await apiRequest(
                    `/attendance/${encodeURIComponent(existing.id)}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(payload)
                    }
                );
            } else {
                await apiRequest("/attendance", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
            }
        }

        await loadAttendanceFromDatabase();

        renderDashboard();
        renderRecords();
        renderReports();

        showToast(
            "Saved",
            "Attendance saved successfully.",
            "success"
        );
    } catch (error) {
        console.error("Save attendance:", error);

        showToast(
            "Attendance Save Failed",
            `${error.message}. Check your Spring Boot attendance API.`,
            "error"
        );
    } finally {
        if (button) button.disabled = false;
    }
}

/* =========================================================
   ATTENDANCE RECORDS
   ========================================================= */

function setupRecords() {
    [
        "recordSearch",
        "recordClass",
        "recordSubject",
        "recordStartDate",
        "recordEndDate",
        "recordFromDate",
        "recordToDate",
        "recordStatus"
    ].forEach(id => {
        $(id)?.addEventListener("input", renderRecords);
        $(id)?.addEventListener("change", renderRecords);
    });

    $("recordClass")?.addEventListener("change", () => {
        populateRecordSubjectDropdown();
        renderRecords();
    });
}

function populateRecordSubjectDropdown() {
    const select = $("recordSubject");
    if (!select) return;

    const previous = select.value || "all";
    const classId = $("recordClass")?.value || "all";
    const relevantSubjects = classId === "all"
        ? subjects
        : subjects.filter(subject => String(subject.classId) === String(classId));

    select.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Subjects";
    select.appendChild(allOption);

    relevantSubjects.forEach(subject => {
        const option = document.createElement("option");
        option.value = String(subject.subjectId);
        option.textContent = subject.subjectName;
        select.appendChild(option);
    });

    if ([...select.options].some(option => option.value === previous)) {
        select.value = previous;
    } else {
        select.value = "all";
    }
}

function renderRecords() {
    const table = $("recordsTable") || $("attendanceRecordsTable");
    if (!table) return;

    const search = $("recordSearch")?.value.trim().toLowerCase() || "";
    const classId = $("recordClass")?.value || "all";
    const startDate =
        $("recordFromDate")?.value ||
        $("recordStartDate")?.value || "";
    const endDate =
        $("recordToDate")?.value ||
        $("recordEndDate")?.value || "";
    const status = $("recordStatus")?.value || "all";
    const subjectId = $("recordSubject")?.value || "all";

    let list = attendanceRecords.map(record => {
        const student = students.find(
            item => String(item.id) === String(record.studentId)
        );

        return {
            ...record,
            studentName: record.studentName || student?.name || "-",
            roll: record.roll || student?.roll || "-",
            classId: record.classId ?? student?.classId,
            subject: record.subjectName ||
                getSubjectNameFromId(record.subjectId) ||
                (record.subjectId != null ? `Subject ID ${record.subjectId}` : "-")
        };
    });

    if (search) {
        list = list.filter(record =>
            String(record.studentName).toLowerCase().includes(search) ||
            String(record.roll).toLowerCase().includes(search) ||
            String(record.subject).toLowerCase().includes(search)
        );
    }

    if (classId !== "all" && classId !== "") {
        list = list.filter(
            record => String(record.classId) === String(classId)
        );
    }

    if (subjectId !== "all" && subjectId !== "") {
        list = list.filter(
            record => String(record.subjectId) === String(subjectId)
        );
    }

    if (startDate) {
        list = list.filter(
            record => String(record.date).slice(0, 10) >= startDate
        );
    }

    if (endDate) {
        list = list.filter(
            record => String(record.date).slice(0, 10) <= endDate
        );
    }

    if (status !== "all" && status !== "") {
        list = list.filter(
            record => record.status.toLowerCase() === status.toLowerCase()
        );
    }

    const summary = $("recordsSummary");
    if (summary) {
        const presentCount = list.filter(record => record.status === "Present").length;
        const absentCount = list.filter(record => record.status === "Absent").length;
        const otherCount = list.length - presentCount - absentCount;
        summary.innerHTML = `
            <div class="report-card"><span>Filtered Records</span><strong>${list.length}</strong></div>
            <div class="report-card"><span>Present</span><strong>${presentCount}</strong></div>
            <div class="report-card"><span>Absent</span><strong>${absentCount}</strong></div>
        `;
        if (otherCount > 0) {
            summary.insertAdjacentHTML("beforeend", `<div class="report-card"><span>Other / Unmarked</span><strong>${otherCount}</strong></div>`);
        }
    }

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">No records found.</td>
            </tr>
        `;
        return;
    }

    list.sort((a, b) =>
        String(b.date).localeCompare(String(a.date))
    );

    table.innerHTML = list.map(record => `
        <tr>
            <td>${escapeHTML(formatDate(record.date))}</td>
            <td>${escapeHTML(record.roll)}</td>
            <td>${escapeHTML(record.studentName)}</td>
            <td>${escapeHTML(
                getClassNameFromId(record.classId) || "-"
            )}</td>
            <td>${escapeHTML(record.subject)}</td>
            <td>
                <span class="status-badge status-${escapeHTML(
                    record.status.toLowerCase().replace(/\s+/g, "-")
                )}">
                    ${escapeHTML(record.status)}
                </span>
            </td>
        </tr>
    `).join("");
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
    const today = getTodayDate();

    const todaysRecords = attendanceRecords.filter(
        record => String(record.date).slice(0, 10) === today
    );

    // Count one daily status per student so multiple subject records do not
    // inflate the dashboard cards. The most recent record for that student wins.
    const latestByStudent = new Map();
    [...todaysRecords]
        .sort((a, b) => String(a.id ?? "").localeCompare(String(b.id ?? "")))
        .forEach(record => {
            if (record.status === "Present" || record.status === "Absent") {
                latestByStudent.set(String(record.studentId), record);
            }
        });

    const dailyStatuses = [...latestByStudent.values()];
    const present = dailyStatuses.filter(record => record.status === "Present").length;
    const absent = dailyStatuses.filter(record => record.status === "Absent").length;
    const total = students.length;
    const markedStudents = new Set(latestByStudent.keys());
    const notMarked = Math.max(0, total - markedStudents.size);
    const rate = markedStudents.size
        ? Math.round((present / markedStudents.size) * 100)
        : 0;

    setText("totalStudents", total);
    setText("presentToday", present);
    setText("absentToday", absent);
    setText("attendanceRate", `${rate}%`);

    setText("summaryPresent", present);
    setText("summaryAbsent", absent);
    setText("summaryNotMarked", notMarked);

    setWidth("presentProgress", total ? (present / total) * 100 : 0);
    setWidth("absentProgress", total ? (absent / total) * 100 : 0);
    setWidth("notMarkedProgress", total ? (notMarked / total) * 100 : 0);

    const recentTable = $("recentAttendanceTable");

    if (recentTable) {
        const recent = [...attendanceRecords]
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 5);

        recentTable.innerHTML = recent.length
            ? recent.map(record => {
                const student = students.find(
                    item => String(item.id) === String(record.studentId)
                );

                return `
                    <tr>
                        <td>${escapeHTML(
                            record.studentName || student?.name || "-"
                        )}</td>
                        <td>${escapeHTML(
                            record.roll || student?.roll || "-"
                        )}</td>
                        <td>${escapeHTML(
                            getClassNameFromId(
                                record.classId ?? student?.classId
                            ) || "-"
                        )}</td>
                        <td>${escapeHTML(formatDate(record.date))}</td>
                        <td>${escapeHTML(record.status)}</td>
                    </tr>
                `;
            }).join("")
            : `<tr><td colspan="5">No attendance records found.</td></tr>`;
    }
}

function setText(id, value) {
    if ($(id)) $(id).textContent = String(value);
}

function setWidth(id, percentage) {
    if ($(id)) {
        $(id).style.width =
            `${Math.min(100, Math.max(0, percentage))}%`;
    }
}
/* =========================================================
   REPORTS
   ========================================================= */

function setupReports() {
    [
        "reportStartDate",
        "reportEndDate",
        "reportClass"
    ].forEach(id => {
        $(id)?.addEventListener("change", renderReports);
    });

    $("exportReportBtn")?.addEventListener("click", exportReportCSV);
}

function renderReports() {
    const table = $("reportsTable") || $("reportTable");

    const startDate = $("reportStartDate")?.value || "";
    const endDate = $("reportEndDate")?.value || "";
    const classId = $("reportClass")?.value || "all";

    let records = [...attendanceRecords];

    if (startDate) {
        records = records.filter(
            record => String(record.date).slice(0, 10) >= startDate
        );
    }

    if (endDate) {
        records = records.filter(
            record => String(record.date).slice(0, 10) <= endDate
        );
    }

    if (classId !== "all" && classId !== "") {
        records = records.filter(record => {
            const student = students.find(
                item => String(item.id) === String(record.studentId)
            );

            return String(
                record.classId ?? student?.classId
            ) === String(classId);
        });
    }

    const present = records.filter(
        record => record.status === "Present"
    ).length;

    const absent = records.filter(
        record => record.status === "Absent"
    ).length;

    const marked = present + absent;
    const rate = marked ? Math.round((present / marked) * 100) : 0;

    setText("reportTotalPresent", present);
    setText("reportTotalAbsent", absent);
    setText("reportAttendanceRate", `${rate}%`);
    setText("reportTotalRecords", records.length);

    if (!table) return;

    const perStudent = new Map();

    records.forEach(record => {
        const student = students.find(
            item => String(item.id) === String(record.studentId)
        );

        const key = String(record.studentId);

        if (!perStudent.has(key)) {
            perStudent.set(key, {
                roll: record.roll || student?.roll || "-",
                name: record.studentName || student?.name || "-",
                present: 0,
                absent: 0
            });
        }

        const item = perStudent.get(key);

        if (record.status === "Present") item.present++;
        if (record.status === "Absent") item.absent++;
    });

    const rows = [...perStudent.values()];

    table.innerHTML = rows.length
        ? rows.map(item => {
            const total = item.present + item.absent;
            const percentage = total
                ? Math.round((item.present / total) * 100)
                : 0;

            return `
                <tr>
                    <td>${escapeHTML(item.roll)}</td>
                    <td>${escapeHTML(item.name)}</td>
                    <td>${item.present}</td>
                    <td>${item.absent}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }).join("")
        : `<tr><td colspan="5">No report data found.</td></tr>`;
}

function exportReportCSV() {
    const rows = [
        [
            "Date",
            "Roll Number",
            "Student Name",
            "Class",
            "Subject",
            "Status"
        ]
    ];

    attendanceRecords.forEach(record => {
        const student = students.find(
            item => String(item.id) === String(record.studentId)
        );

        rows.push([
            record.date || "",
            record.roll || student?.roll || "",
            record.studentName || student?.name || "",
            getClassNameFromId(record.classId ?? student?.classId) || "",
            record.subjectName ||
                getSubjectNameFromId(record.subjectId) ||
                (record.subjectId != null
                    ? `Subject ID ${record.subjectId}`
                    : ""),
            record.status || ""
        ]);
    });

    const csv = rows.map(row =>
        row.map(value =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(",")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "attendance-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================================================
   PROFILE
   ========================================================= */

function setupProfile() {
    $("profileForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const name = $("profileName")?.value.trim() || "";
        const email = $("profileEmail")?.value.trim() || "";
        const phone = $("profilePhone")?.value.trim() || "";

        if (!name || !email) {
            showToast("Missing Information", "Please enter your name and email address.", "error");
            return;
        }

        currentUser = { ...currentUser, name, email, phone };
        localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
        loadProfile();

        if ($("topbarUserName")) $("topbarUserName").textContent = currentUser.name;
        showToast("Profile Updated", "Your administrator profile was saved in this browser.", "success");
    });
}

function loadProfile() {
    if ($("profileName")) $("profileName").value = currentUser.name || "";
    if ($("profileEmail")) $("profileEmail").value = currentUser.email || "";
    if ($("profilePhone")) $("profilePhone").value = currentUser.phone || "";

    const name = currentUser.name || "Administrator";
    const email = currentUser.email || "";
    const initial = name.trim().charAt(0).toUpperCase() || "A";

    if ($("profileAvatar")) $("profileAvatar").textContent = initial;
    if ($("profileDisplayName")) $("profileDisplayName").textContent = name;
    if ($("profileDisplayEmail")) $("profileDisplayEmail").textContent = email;
    if ($("profileUsername")) $("profileUsername").textContent = currentUser.username || "admin";
    if ($("topbarUserName")) $("topbarUserName").textContent = name;

    updateProfileStats();
}

function updateProfileStats() {
    const values = {
        profileStudentCount: students.length,
        profileClassCount: classes.length,
        profileSubjectCount: subjects.length,
        profileAttendanceCount: attendanceRecords.length
    };
    Object.entries(values).forEach(([id, value]) => {
        const element = $(id);
        if (element) element.textContent = String(Number(value) || 0);
    });
}

/* =========================================================
   SETTINGS
   ========================================================= */

/* =========================================================
   SETTINGS
   ========================================================= */

function setupSettings() {

    // Load saved preferences when Settings is initialised
    loadSettings();

    // Settings form submit
    $("settingsForm")?.addEventListener("submit", event => {
        event.preventDefault();

        const saved = saveSettings();

        if (saved) {
            showToast(
                "Settings Saved",
                "Application settings saved successfully.",
                "success"
            );
        }
    });

    // Save Settings button
    $("saveSettingsBtn")?.addEventListener("click", event => {

        // Avoid duplicate saving when the button submits the form
        if (
            event.currentTarget.form &&
            event.currentTarget.type !== "button"
        ) {
            return;
        }

        const saved = saveSettings();

        if (saved) {
            showToast(
                "Settings Saved",
                "Your preferences have been saved.",
                "success"
            );
        }
    });

    // Open Profile button
    $("openProfileSettingsBtn")?.addEventListener("click", () => {

        // Use the existing profile navigation if available
        const profileNav = document.querySelector(
            '[data-section="profileSection"]'
        );

        if (profileNav) {
            profileNav.click();
            return;
        }

        const profileSection = $("profileSection");

        if (profileSection) {
            document.querySelectorAll(".content-section")
                .forEach(section => section.classList.remove("active"));

            profileSection.classList.add("active");
        } else {
            showToast(
                "Profile Unavailable",
                "Profile section could not be found.",
                "warning"
            );
        }
    });
}


/* =========================================================
   LOAD SETTINGS
   ========================================================= */

function loadSettings() {

    let settings = { ...DEFAULT_SETTINGS };

    try {
        const saved = localStorage.getItem(SETTINGS_KEY);

        if (saved) {
            settings = {
                ...settings,
                ...JSON.parse(saved)
            };
        }
    } catch (error) {
        console.warn("Settings load error:", error);
    }

    // Theme
    if ($("themeSelect")) {
        $("themeSelect").value = settings.theme || "light";
    }

    // Support both old and new notification IDs
    const notificationInput =
        $("notificationSetting") || $("notificationsToggle");

    if (notificationInput) {
        notificationInput.checked =
            settings.notifications !== false;
    }

    // Email reports
    if ($("emailReportSetting")) {
        $("emailReportSetting").checked =
            Boolean(settings.emailReports);
    }

    // Compact tables
    if ($("compactTableSetting")) {
        $("compactTableSetting").checked =
            Boolean(settings.compactTables);
    }

    // Apply preferences
    applyAttendanceDeskSettings(settings);
}


/* =========================================================
   SAVE SETTINGS
   ========================================================= */

function saveSettings() {

    try {
        let existingSettings = {};

        try {
            existingSettings = JSON.parse(
                localStorage.getItem(SETTINGS_KEY) || "{}"
            );
        } catch (error) {
            console.warn("Existing settings could not be read:", error);
        }

        const notificationInput =
            $("notificationSetting") || $("notificationsToggle");

        const settings = {
            ...DEFAULT_SETTINGS,
            ...existingSettings,

            theme: $("themeSelect")?.value || "light",

            notifications: notificationInput
                ? notificationInput.checked
                : existingSettings.notifications !== false,

            emailReports: $("emailReportSetting")
                ? $("emailReportSetting").checked
                : Boolean(existingSettings.emailReports),

            compactTables: $("compactTableSetting")
                ? $("compactTableSetting").checked
                : Boolean(existingSettings.compactTables),

            itemsPerPage:
                existingSettings.itemsPerPage ??
                DEFAULT_SETTINGS.itemsPerPage
        };

        localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify(settings)
        );

        applyAttendanceDeskSettings(settings);

        return true;

    } catch (error) {
        console.error("Settings save error:", error);

        showToast(
            "Save Failed",
            "Could not save your settings. Please try again.",
            "error"
        );

        return false;
    }
}


/* =========================================================
   APPLY SETTINGS
   ========================================================= */

function applyAttendanceDeskSettings(settings) {

    const theme = settings.theme || "light";

    // Preserve the existing theme attribute
    document.documentElement.dataset.theme = theme;

    // Apply dark mode
    document.body.classList.toggle(
        "dark-mode",
        theme === "dark"
    );

    // Apply compact table preference
    document.body.classList.toggle(
        "compact-tables",
        Boolean(settings.compactTables)
    );
}

/* =========================================================
   END OF SCRIPT
   ========================================================= */