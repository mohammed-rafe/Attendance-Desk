const API_BASE_URL = "http://localhost:8080/api";

let students = [];
let classes = [];
let attendanceRecords = [];
let currentAttendance = {};

let currentUser = {
    username: "admin",
    name: "Administrator",
    role: "Administrator",
    email: "admin@attendancedesk.com",
    phone: ""
};

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

async function initializeApp() {
    setupLogin();
    setupNavigation();
    setupStudents();
    setupAttendance();
    setupRecords();
    setupReports();
    setupProfile();
    setupSettings();
    setupLogout();
    setupMobileMenu();
    setupToast();
    setupGlobalEvents();

    updateDate();
    setDefaultDates();
    loadSettings();
    loadSavedSession();

    await loadClassesFromDatabase();
    await loadStudentsFromDatabase();

    renderStudents();
    renderDashboard();
    renderRecords();
    renderReports();
}

function $(id) {
    return document.getElementById(id);
}

function updateDate() {
    const now = new Date();

    const formatted = now.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    if ($("currentDate")) {
        $("currentDate").textContent = formatted;
    }

    if ($("dashboardDate")) {
        $("dashboardDate").textContent = formatted;
    }
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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

async function loadClassesFromDatabase() {
    try {
        const response = await fetch(`${API_BASE_URL}/classes`);

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        classes = Array.isArray(data)
            ? data.map(item => ({
                classId: item.classId,
                className: item.className || "",
                division: item.division || ""
            }))
            : [];

        populateClassDropdowns();

        console.log("Classes loaded from MySQL:", classes);
    } catch (error) {
        console.error("Class loading error:", error);

        classes = [];
        populateClassDropdowns();

        showToast(
            "Database Error",
            "Classes could not be loaded from the database.",
            "error"
        );
    }
}

async function loadStudentsFromDatabase() {
    try {
        const response = await fetch(`${API_BASE_URL}/students`);

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        students = Array.isArray(data)
            ? data.map(student => ({
                id: student.studentId,
                roll: student.rollNumber || "",
                name: student.studentName || "",
                email: student.email || "",
                phone: student.phone || "",
                classId: student.classId,
                className: getClassNameFromId(student.classId)
            }))
            : [];

        console.log("Students loaded from MySQL:", students);
    } catch (error) {
        console.error("Student loading error:", error);

        students = [];

        showToast(
            "Database Error",
            "Students could not be loaded from the database.",
            "error"
        );
    }
}

function populateClassDropdowns() {
    const dropdownIds = [
        "studentClass",
        "attendanceClass",
        "recordClass",
        "classFilter"
    ];

    dropdownIds.forEach(id => {
        const select = $(id);

        if (!select) return;

        const oldValue = select.value;
        const isFilter =
            id === "classFilter" ||
            id === "recordClass";

        select.innerHTML = "";

        const defaultOption = document.createElement("option");

        if (isFilter) {
            defaultOption.value = "all";
            defaultOption.textContent = "All Classes";
        } else {
            defaultOption.value = "";
            defaultOption.textContent = "Select Class";
        }

        select.appendChild(defaultOption);

        classes.forEach(item => {
            const option = document.createElement("option");

            option.value = String(item.classId);

            option.textContent = item.division
                ? `${item.className} - ${item.division}`
                : item.className;

            select.appendChild(option);
        });

        if (
            oldValue &&
            [...select.options].some(
                option => option.value === oldValue
            )
        ) {
            select.value = oldValue;
        }
    });
}

function getClassNameFromId(classId) {
    const item = classes.find(
        value =>
            Number(value.classId) === Number(classId)
    );

    if (!item) return "";

    return item.division
        ? `${item.className} - ${item.division}`
        : item.className;
}

function setupLogin() {
    const form = $("loginForm");

    if (form) {
        form.addEventListener("submit", handleLogin);
    }

    if ($("forgotPassword")) {
        $("forgotPassword").addEventListener(
            "click",
            event => {
                event.preventDefault();

                showToast(
                    "Forgot Password",
                    "Please contact the administrator to reset your password.",
                    "info"
                );
            }
        );
    }
}

function handleLogin(event) {
    event.preventDefault();

    const username = $("loginUsername")
        ? $("loginUsername").value.trim()
        : "";

    const password = $("loginPassword")
        ? $("loginPassword").value.trim()
        : "";

    if ($("usernameError")) {
        $("usernameError").textContent = "";
    }

    if ($("passwordError")) {
        $("passwordError").textContent = "";
    }

    let valid = true;

    if (!username) {
        if ($("usernameError")) {
            $("usernameError").textContent =
                "Username is required.";
        }

        valid = false;
    }

    if (!password) {
        if ($("passwordError")) {
            $("passwordError").textContent =
                "Password is required.";
        }

        valid = false;
    }

    if (!valid) return;

    if (
        username === "admin" &&
        password === "admin123"
    ) {
        currentUser = {
            username: "admin",
            name: "Administrator",
            role: "Administrator",
            email: "admin@attendancedesk.com",
            phone: ""
        };

        if (
            $("rememberMe") &&
            $("rememberMe").checked
        ) {
            localStorage.setItem(
                "attendanceDeskUser",
                JSON.stringify(currentUser)
            );
        }

        showMainApplication();

        showToast(
            "Welcome",
            "Login successful.",
            "success"
        );
    } else {
        if ($("passwordError")) {
            $("passwordError").textContent =
                "Invalid username or password.";
        }

        showToast(
            "Login Failed",
            "Please check your username and password.",
            "error"
        );
    }
}

function showMainApplication() {
    if ($("loginPage")) {
        $("loginPage").classList.add("hidden");
    }

    if ($("mainApp")) {
        $("mainApp").classList.remove("hidden");
    }

    if ($("topbarUserName")) {
        $("topbarUserName").textContent =
            currentUser.name || "Administrator";
    }

    loadProfile();
}

function loadSavedSession() {
    const saved =
        localStorage.getItem("attendanceDeskUser");

    if (!saved) return;

    try {
        currentUser = JSON.parse(saved);
        showMainApplication();
    } catch {
        localStorage.removeItem("attendanceDeskUser");
    }
}

function setupLogout() {
    if (!$("logoutBtn")) return;

    $("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("attendanceDeskUser");

        if ($("mainApp")) {
            $("mainApp").classList.add("hidden");
        }

        if ($("loginPage")) {
            $("loginPage").classList.remove("hidden");
        }

        if ($("loginForm")) {
            $("loginForm").reset();
        }

        showToast(
            "Logged Out",
            "You have been logged out successfully.",
            "success"
        );
    });
}

function setupNavigation() {
    document
        .querySelectorAll(".nav-item")
        .forEach(item => {
            item.addEventListener("click", () => {
                const section = item.dataset.section;

                if (!section) return;

                document
                    .querySelectorAll(".nav-item")
                    .forEach(nav =>
                        nav.classList.remove("active")
                    );

                item.classList.add("active");

                document
                    .querySelectorAll(".content-section")
                    .forEach(sectionElement =>
                        sectionElement.classList.remove("active")
                    );

                const target = $(section);

                if (target) {
                    target.classList.add("active");
                }

                updatePageHeader(section);

                if (
                    window.innerWidth <= 768 &&
                    document.querySelector(".sidebar")
                ) {
                    document
                        .querySelector(".sidebar")
                        .classList.remove("open");
                }
            });
        });
}

function updatePageHeader(section) {
    const pageData = {
        dashboard: [
            "Dashboard",
            "Overview of attendance activity"
        ],
        students: [
            "Students",
            "Manage student records"
        ],
        attendance: [
            "Mark Attendance",
            "Record daily student attendance"
        ],
        records: [
            "Attendance Records",
            "View and filter attendance records"
        ],
        reports: [
            "Reports",
            "Attendance reports and analytics"
        ],
        profile: [
            "Profile",
            "Manage your profile information"
        ],
        settings: [
            "Settings",
            "Manage application settings"
        ]
    };

    const data = pageData[section];

    if (!data) return;

    if ($("pageTitle")) {
        $("pageTitle").textContent = data[0];
    }

    if ($("pageSubtitle")) {
        $("pageSubtitle").textContent = data[1];
    }
}

function setupMobileMenu() {
    const button = $("mobileMenuBtn");
    const sidebar = document.querySelector(".sidebar");

    if (!button || !sidebar) return;

    button.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
}

function setupStudents() {
    if ($("addStudentBtn")) {
        $("addStudentBtn").addEventListener(
            "click",
            openStudentModal
        );
    }

    if ($("closeStudentModal")) {
        $("closeStudentModal").addEventListener(
            "click",
            closeStudentModal
        );
    }

    if ($("cancelStudentBtn")) {
        $("cancelStudentBtn").addEventListener(
            "click",
            closeStudentModal
        );
    }

    if ($("studentForm")) {
        $("studentForm").addEventListener(
            "submit",
            addStudent
        );
    }

    if ($("studentSearch")) {
        $("studentSearch").addEventListener(
            "input",
            renderStudents
        );
    }

    if ($("classFilter")) {
        $("classFilter").addEventListener(
            "change",
            renderStudents
        );
    }
}

function openStudentModal() {
    const modal = $("studentModal");

    if (!modal) return;

    modal.classList.remove("hidden");

    if ($("studentRoll")) {
        $("studentRoll").focus();
    }
}

function closeStudentModal() {
    if ($("studentModal")) {
        $("studentModal").classList.add("hidden");
    }

    if ($("studentForm")) {
        $("studentForm").reset();
    }
}

async function addStudent(event) {
    event.preventDefault();

    const roll = $("studentRoll")
        ? $("studentRoll").value.trim()
        : "";

    const name = $("studentName")
        ? $("studentName").value.trim()
        : "";

    const email = $("studentEmail")
        ? $("studentEmail").value.trim()
        : "";

    const phone = $("studentPhone")
        ? $("studentPhone").value.trim()
        : "";

    const classId = $("studentClass")
        ? $("studentClass").value
        : "";

    if (!roll || !name || !classId) {
        showToast(
            "Missing Information",
            "Please fill all required fields.",
            "error"
        );

        return;
    }

    const duplicate = students.find(
        student =>
            String(student.roll).toLowerCase() ===
            String(roll).toLowerCase()
    );

    if (duplicate) {
        showToast(
            "Duplicate Roll Number",
            "This roll number already exists.",
            "error"
        );

        return;
    }

    const studentData = {
        rollNumber: roll,
        studentName: name,
        email: email || null,
        phone: phone || null,
        classId: Number(classId)
    };

    try {
        const response = await fetch(
            `${API_BASE_URL}/students`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(studentData)
            }
        );

        if (!response.ok) {
            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const saved = await response.json();

        students.push({
            id: saved.studentId,
            roll: saved.rollNumber || roll,
            name: saved.studentName || name,
            email: saved.email || email,
            phone: saved.phone || phone,
            classId: saved.classId || Number(classId),
            className:
                getClassNameFromId(
                    saved.classId || Number(classId)
                )
        });

        renderStudents();
        renderDashboard();
        closeStudentModal();

        showToast(
            "Student Added",
            "Student has been added successfully.",
            "success"
        );
    } catch (error) {
        console.error("Add student error:", error);

        showToast(
            "Database Error",
            error.message || "Unable to add student.",
            "error"
        );
    }
}

function renderStudents() {
    const table = $("studentsTable");

    if (!table) return;

    const search = $("studentSearch")
        ? $("studentSearch").value
            .trim()
            .toLowerCase()
        : "";

    const selectedClass = $("classFilter")
        ? $("classFilter").value
        : "all";

    let list = [...students];

    if (search) {
        list = list.filter(student =>
            String(student.roll)
                .toLowerCase()
                .includes(search) ||
            String(student.name)
                .toLowerCase()
                .includes(search) ||
            String(student.email)
                .toLowerCase()
                .includes(search)
        );
    }

    if (
        selectedClass &&
        selectedClass !== "all"
    ) {
        list = list.filter(
            student =>
                String(student.classId) ===
                String(selectedClass)
        );
    }

    if (!list.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No students found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = list
        .map((student, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>
                        ${escapeHTML(student.roll)}
                    </strong>
                </td>
                <td>
                    ${escapeHTML(student.name)}
                </td>
                <td>
                    ${escapeHTML(student.email || "-")}
                </td>
                <td>
                    ${escapeHTML(student.phone || "-")}
                </td>
                <td>
                    ${escapeHTML(
                        student.className ||
                        getClassNameFromId(
                            student.classId
                        ) ||
                        "-"
                    )}
                </td>
                <td>
                    <div class="table-actions">
                        <button
                            class="btn btn-sm btn-secondary"
                            data-action="edit-student"
                            data-id="${student.id}">
                            Edit
                        </button>

                        <button
                            class="btn btn-sm btn-danger"
                            data-action="delete-student"
                            data-id="${student.id}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `)
        .join("");
}

function editStudent(id) {
    const student = students.find(
        item => Number(item.id) === Number(id)
    );

    if (!student) return;

    if ($("studentRoll")) {
        $("studentRoll").value = student.roll;
    }

    if ($("studentName")) {
        $("studentName").value = student.name;
    }

    if ($("studentEmail")) {
        $("studentEmail").value = student.email;
    }

    if ($("studentPhone")) {
        $("studentPhone").value = student.phone;
    }

    if ($("studentClass")) {
        $("studentClass").value =
            String(student.classId);
    }

    openStudentModal();

    showToast(
        "Edit Mode",
        "You can edit the student information.",
        "info"
    );
}

function deleteStudent(id) {
    const student = students.find(
        item => Number(item.id) === Number(id)
    );

    if (!student) return;

    const confirmed = confirm(
        `Delete ${student.name}?`
    );

    if (!confirmed) return;

    students = students.filter(
        item => Number(item.id) !== Number(id)
    );

    renderStudents();
    renderDashboard();

    showToast(
        "Student Removed",
        "Student was removed from the current list.",
        "success"
    );
}
function setupAttendance() {
    if ($("loadStudentsBtn")) {
        $("loadStudentsBtn").addEventListener(
            "click",
            loadAttendanceStudents
        );
    }

    if ($("markAllPresent")) {
        $("markAllPresent").addEventListener(
            "click",
            () => markAll("Present")
        );
    }

    if ($("markAllAbsent")) {
        $("markAllAbsent").addEventListener(
            "click",
            () => markAll("Absent")
        );
    }

    if ($("saveAttendanceBtn")) {
        $("saveAttendanceBtn").addEventListener(
            "click",
            saveAttendance
        );
    }
}

function loadAttendanceStudents() {
    const selectedClass =
        $("attendanceClass")
            ? $("attendanceClass").value
            : "";

    const table = $("attendanceTable");

    if (!table) return;

    if (!selectedClass || selectedClass === "all") {
        table.innerHTML = `
            <tr>
                <td colspan="4">
                    Please select a class first.
                </td>
            </tr>
        `;

        showToast(
            "Select Class",
            "Please select a class to load students.",
            "error"
        );

        return;
    }

    const classStudents = students.filter(
        student =>
            String(student.classId) ===
            String(selectedClass)
    );

    if (!classStudents.length) {
        table.innerHTML = `
            <tr>
                <td colspan="4">
                    No students found in this class.
                </td>
            </tr>
        `;

        return;
    }

    currentAttendance = {};

    classStudents.forEach(student => {
        currentAttendance[student.id] =
            "Present";
    });

    renderAttendanceTable(classStudents);

    showToast(
        "Students Loaded",
        `${classStudents.length} students loaded.`,
        "success"
    );
}

function renderAttendanceTable(list) {
    const table = $("attendanceTable");

    if (!table) return;

    table.innerHTML = list
        .map((student, index) => {
            const status =
                currentAttendance[student.id] ||
                "Present";

            return `
                <tr>
                    <td>${index + 1}</td>

                    <td>
                        <strong>
                            ${escapeHTML(student.roll)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(student.name)}
                    </td>

                    <td>
                        <div class="attendance-status">

                            <button
                                class="present-btn ${
                                    status === "Present"
                                        ? "active"
                                        : ""
                                }"
                                data-action="attendance"
                                data-id="${student.id}"
                                data-status="Present">
                                Present
                            </button>

                            <button
                                class="absent-btn ${
                                    status === "Absent"
                                        ? "active"
                                        : ""
                                }"
                                data-action="attendance"
                                data-id="${student.id}"
                                data-status="Absent">
                                Absent
                            </button>

                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");
}

function setAttendance(studentId, status) {
    currentAttendance[studentId] = status;

    const selectedClass =
        $("attendanceClass")
            ? $("attendanceClass").value
            : "";

    const list = students.filter(
        student =>
            String(student.classId) ===
            String(selectedClass)
    );

    renderAttendanceTable(list);
}

function markAll(status) {
    const selectedClass =
        $("attendanceClass")
            ? $("attendanceClass").value
            : "";

    if (!selectedClass || selectedClass === "all") {
        showToast(
            "Select Class",
            "Please load a class first.",
            "error"
        );

        return;
    }

    const list = students.filter(
        student =>
            String(student.classId) ===
            String(selectedClass)
    );

    if (!list.length) {
        showToast(
            "No Students",
            "No students found in this class.",
            "error"
        );

        return;
    }

    list.forEach(student => {
        currentAttendance[student.id] =
            status;
    });

    renderAttendanceTable(list);

    showToast(
        "Attendance Updated",
        `All students marked ${status}.`,
        "success"
    );
}

function saveAttendance() {
    const date =
        $("attendanceDate")
            ? $("attendanceDate").value
            : "";

    const classId =
        $("attendanceClass")
            ? $("attendanceClass").value
            : "";

    const subject =
        $("attendanceSubject")
            ? $("attendanceSubject").value
            : "";

    if (!date) {
        showToast(
            "Select Date",
            "Please select attendance date.",
            "error"
        );

        return;
    }

    if (!classId || classId === "all") {
        showToast(
            "Select Class",
            "Please select a class.",
            "error"
        );

        return;
    }

    if (!subject || subject === "all") {
        showToast(
            "Select Subject",
            "Please select a subject.",
            "error"
        );

        return;
    }

    const list = students.filter(
        student =>
            String(student.classId) ===
            String(classId)
    );

    if (!list.length) {
        showToast(
            "No Students",
            "No students found.",
            "error"
        );

        return;
    }

    list.forEach(student => {
        const status =
            currentAttendance[student.id] ||
            "Present";

        const existing =
            attendanceRecords.find(
                record =>
                    Number(record.studentId) ===
                        Number(student.id) &&
                    record.date === date &&
                    record.subject === subject
            );

        const record = {
            studentId: student.id,
            studentName: student.name,
            roll: student.roll,
            classId: student.classId,
            className:
                student.className ||
                getClassNameFromId(
                    student.classId
                ),
            subject,
            date,
            status
        };

        if (existing) {
            Object.assign(existing, record);
        } else {
            attendanceRecords.push(record);
        }
    });

    showToast(
        "Attendance Saved",
        "Attendance has been saved successfully.",
        "success"
    );

    renderDashboard();
    renderRecords();
    renderReports();
}

function setupRecords() {
    if ($("filterRecordsBtn")) {
        $("filterRecordsBtn").addEventListener(
            "click",
            renderRecords
        );
    }
}

function renderRecords() {
    const table = $("recordsTable");

    if (!table) return;

    const from =
        $("recordFromDate")
            ? $("recordFromDate").value
            : "";

    const to =
        $("recordToDate")
            ? $("recordToDate").value
            : "";

    const selectedClass =
        $("recordClass")
            ? $("recordClass").value
            : "all";

    let records = [...attendanceRecords];

    if (from) {
        records = records.filter(
            record => record.date >= from
        );
    }

    if (to) {
        records = records.filter(
            record => record.date <= to
        );
    }

    if (
        selectedClass &&
        selectedClass !== "all"
    ) {
        records = records.filter(
            record =>
                String(record.classId) ===
                String(selectedClass)
        );
    }

    if (!records.length) {
        table.innerHTML = `
            <tr>
                <td colspan="7">
                    No attendance records found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = records
        .map((record, index) => `
            <tr>
                <td>${index + 1}</td>

                <td>
                    ${escapeHTML(record.roll)}
                </td>

                <td>
                    ${escapeHTML(record.studentName)}
                </td>

                <td>
                    ${escapeHTML(
                        record.className || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        record.subject || "-"
                    )}
                </td>

                <td>
                    ${formatDate(record.date)}
                </td>

                <td>
                    <span class="status-badge ${
                        record.status === "Present"
                            ? "present"
                            : "absent"
                    }">
                        ${escapeHTML(record.status)}
                    </span>
                </td>
            </tr>
        `)
        .join("");
}

function setupReports() {
    if ($("printReportBtn")) {
        $("printReportBtn").addEventListener(
            "click",
            () => window.print()
        );
    }
}

function renderReports() {
    const table = $("reportsTable");

    if (!table) return;

    if (!attendanceRecords.length) {
        if ($("overallAttendance")) {
            $("overallAttendance").textContent =
                "0%";
        }

        if ($("highestAttendance")) {
            $("highestAttendance").textContent =
                "-";
        }

        if ($("lowestAttendance")) {
            $("lowestAttendance").textContent =
                "-";
        }

        table.innerHTML = `
            <tr>
                <td colspan="7">
                    No attendance data available.
                </td>
            </tr>
        `;

        return;
    }

    const statsMap = {};

    attendanceRecords.forEach(record => {
        if (!statsMap[record.studentId]) {
            statsMap[record.studentId] = {
                name: record.studentName,
                roll: record.roll,
                className: record.className,
                present: 0,
                absent: 0
            };
        }

        if (record.status === "Present") {
            statsMap[record.studentId].present++;
        } else {
            statsMap[record.studentId].absent++;
        }
    });

    const stats = Object.values(statsMap);

    stats.forEach(item => {
        const total =
            item.present + item.absent;

        item.rate = total
            ? (
                item.present /
                total *
                100
            ).toFixed(1)
            : "0.0";
    });

    const totalPresent =
        attendanceRecords.filter(
            record =>
                record.status === "Present"
        ).length;

    const overall =
        attendanceRecords.length
            ? (
                totalPresent /
                attendanceRecords.length *
                100
            ).toFixed(1)
            : "0.0";

    if ($("overallAttendance")) {
        $("overallAttendance").textContent =
            `${overall}%`;
    }

    const highest = [...stats].sort(
        (a, b) =>
            Number(b.rate) -
            Number(a.rate)
    )[0];

    const lowest = [...stats].sort(
        (a, b) =>
            Number(a.rate) -
            Number(b.rate)
    )[0];

    if ($("highestAttendance")) {
        $("highestAttendance").textContent =
            highest
                ? `${highest.name} (${highest.rate}%)`
                : "-";
    }

    if ($("lowestAttendance")) {
        $("lowestAttendance").textContent =
            lowest
                ? `${lowest.name} (${lowest.rate}%)`
                : "-";
    }

    table.innerHTML = stats
        .map((item, index) => `
            <tr>
                <td>${index + 1}</td>

                <td>
                    ${escapeHTML(item.roll)}
                </td>

                <td>
                    ${escapeHTML(item.name)}
                </td>

                <td>
                    ${escapeHTML(
                        item.className || "-"
                    )}
                </td>

                <td>${item.present}</td>
                <td>${item.absent}</td>
                <td>${item.rate}%</td>
            </tr>
        `)
        .join("");
}

function renderDashboard() {
    const today = getTodayDate();

    const records = attendanceRecords.filter(
        record => record.date === today
    );

    const present = records.filter(
        record => record.status === "Present"
    ).length;

    const absent = records.filter(
        record => record.status === "Absent"
    ).length;

    const marked = present + absent;

    const notMarked = Math.max(
        students.length - marked,
        0
    );

    const rate = marked
        ? (
            present /
            marked *
            100
        ).toFixed(1)
        : "0.0";

    if ($("totalStudents")) {
        $("totalStudents").textContent =
            students.length;
    }

    if ($("presentToday")) {
        $("presentToday").textContent =
            present;
    }

    if ($("absentToday")) {
        $("absentToday").textContent =
            absent;
    }

    if ($("attendanceRate")) {
        $("attendanceRate").textContent =
            `${rate}%`;
    }

    if ($("summaryPresent")) {
        $("summaryPresent").textContent =
            present;
    }

    if ($("summaryAbsent")) {
        $("summaryAbsent").textContent =
            absent;
    }

    if ($("summaryNotMarked")) {
        $("summaryNotMarked").textContent =
            notMarked;
    }

    const total =
        Math.max(students.length, 1);

    if ($("presentProgress")) {
        $("presentProgress").style.width =
            `${Math.min(
                present / total * 100,
                100
            )}%`;
    }

    if ($("absentProgress")) {
        $("absentProgress").style.width =
            `${Math.min(
                absent / total * 100,
                100
            )}%`;
    }

    if ($("notMarkedProgress")) {
        $("notMarkedProgress").style.width =
            `${Math.min(
                notMarked / total * 100,
                100
            )}%`;
    }

    renderRecentAttendance();
}

function renderRecentAttendance() {
    const table =
        $("recentAttendanceTable");

    if (!table) return;

    const recent =
        [...attendanceRecords]
            .reverse()
            .slice(0, 8);

    if (!recent.length) {
        table.innerHTML = `
            <tr>
                <td colspan="6">
                    No recent attendance records.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = recent
        .map((record, index) => `
            <tr>
                <td>${index + 1}</td>

                <td>
                    ${escapeHTML(record.roll)}
                </td>

                <td>
                    ${escapeHTML(record.studentName)}
                </td>

                <td>
                    ${escapeHTML(
                        record.className || "-"
                    )}
                </td>

                <td>
                    ${formatDate(record.date)}
                </td>

                <td>
                    <span class="status-badge ${
                        record.status === "Present"
                            ? "present"
                            : "absent"
                    }">
                        ${escapeHTML(record.status)}
                    </span>
                </td>
            </tr>
        `)
        .join("");
}

function setupProfile() {
    if ($("saveProfileBtn")) {
        $("saveProfileBtn").addEventListener(
            "click",
            saveProfile
        );
    }

    loadProfile();
}

function loadProfile() {
    if ($("profileName")) {
        $("profileName").value =
            currentUser.name || "";
    }

    if ($("profileEmail")) {
        $("profileEmail").value =
            currentUser.email ||
            "admin@attendancedesk.com";
    }

    if ($("profilePhone")) {
        $("profilePhone").value =
            currentUser.phone || "";
    }
}

function saveProfile() {
    if ($("profileName")) {
        currentUser.name =
            $("profileName").value.trim();
    }

    if ($("profileEmail")) {
        currentUser.email =
            $("profileEmail").value.trim();
    }

    if ($("profilePhone")) {
        currentUser.phone =
            $("profilePhone").value.trim();
    }

    if ($("topbarUserName")) {
        $("topbarUserName").textContent =
            currentUser.name;
    }

    localStorage.setItem(
        "attendanceDeskUser",
        JSON.stringify(currentUser)
    );

    showToast(
        "Profile Updated",
        "Your profile has been updated successfully.",
        "success"
    );
}

function setupSettings() {
    const notification = $("notificationSetting");
    const emailReport = $("emailReportSetting");
    const compact = $("compactTableSetting");

    if (notification) {
        notification.addEventListener(
            "change",
            () => {
                localStorage.setItem(
                    "attendanceNotifications",
                    notification.checked
                );

                showToast(
                    "Setting Updated",
                    "Notification setting updated.",
                    "success"
                );
            }
        );
    }

    if (emailReport) {
        emailReport.addEventListener(
            "change",
            () => {
                localStorage.setItem(
                    "attendanceEmailReports",
                    emailReport.checked
                );

                showToast(
                    "Setting Updated",
                    "Email report setting updated.",
                    "success"
                );
            }
        );
    }

    if (compact) {
        compact.addEventListener(
            "change",
            () => {
                localStorage.setItem(
                    "attendanceCompactTable",
                    compact.checked
                );

                document.body.classList.toggle(
                    "compact-tables",
                    compact.checked
                );

                showToast(
                    "Setting Updated",
                    "Table display setting updated.",
                    "success"
                );
            }
        );
    }
}

function loadSettings() {
    const notification = $("notificationSetting");
    const emailReport = $("emailReportSetting");
    const compact = $("compactTableSetting");

    const notificationValue =
        localStorage.getItem(
            "attendanceNotifications"
        );

    const emailValue =
        localStorage.getItem(
            "attendanceEmailReports"
        );

    const compactValue =
        localStorage.getItem(
            "attendanceCompactTable"
        );

    if (
        notification &&
        notificationValue !== null
    ) {
        notification.checked =
            notificationValue === "true";
    }

    if (
        emailReport &&
        emailValue !== null
    ) {
        emailReport.checked =
            emailValue === "true";
    }

    if (
        compact &&
        compactValue !== null
    ) {
        compact.checked =
            compactValue === "true";

        document.body.classList.toggle(
            "compact-tables",
            compactValue === "true"
        );
    }
}

function setupToast() {
    if ($("closeToast")) {
        $("closeToast").addEventListener(
            "click",
            hideToast
        );
    }
}

function showToast(
    title,
    message,
    type = "success"
) {
    const toast = $("toast");

    if (!toast) return;

    if ($("toastTitle")) {
        $("toastTitle").textContent = title;
    }

    if ($("toastMessage")) {
        $("toastMessage").textContent = message;
    }

    if ($("toastIcon")) {
        $("toastIcon").textContent =
            type === "error"
                ? "✕"
                : type === "info"
                    ? "i"
                    : "✓";
    }

    toast.classList.remove(
        "hidden",
        "success",
        "error",
        "info"
    );

    toast.classList.add(type);

    clearTimeout(
        window.attendanceToastTimer
    );

    window.attendanceToastTimer =
        setTimeout(hideToast, 3500);
}

function hideToast() {
    if ($("toast")) {
        $("toast").classList.add("hidden");
    }
}

function setDefaultDates() {
    const today = getTodayDate();

    if ($("attendanceDate")) {
        $("attendanceDate").value = today;
    }

    if ($("recordFromDate")) {
        $("recordFromDate").value = today;
    }

    if ($("recordToDate")) {
        $("recordToDate").value = today;
    }
}

function setupGlobalEvents() {
    document.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (!button) return;

            const action =
                button.dataset.action;

            const id =
                button.dataset.id;

            if (action === "edit-student") {
                editStudent(id);
            }

            if (action === "delete-student") {
                deleteStudent(id);
            }

            if (action === "attendance") {
                setAttendance(
                    id,
                    button.dataset.status
                );
            }
        }
    );

    document.addEventListener(
        "click",
        event => {
            const quickAction =
                event.target.closest(
                    "[data-section]"
                );

            if (!quickAction) return;

            const section =
                quickAction.dataset.section;

            if (!section) return;

            const navItem =
                document.querySelector(
                    `.nav-item[data-section="${section}"]`
                );

            if (navItem) {
                navItem.click();
            }
        }
    );
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
/* Attendance Desk - Final Button Fix */

document.addEventListener("DOMContentLoaded", function () {

    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".content-section");

    function openSection(sectionId) {

        if (!sectionId) return;

        const target = document.getElementById(sectionId);

        if (!target) {
            console.warn("Section not found:", sectionId);
            return;
        }

        /* Hide all sections */
        sections.forEach(section => {
            section.classList.remove("active");
            section.classList.remove("active-section");
        });

        /* Show selected section */
        target.classList.add("active");
        target.classList.add("active-section");

        /* Update sidebar */
        navItems.forEach(item => {
            item.classList.remove("active");

            if (item.dataset.section === sectionId) {
                item.classList.add("active");
            }
        });

        /* Update heading */
        const pageData = {

            dashboardSection: {
                title: "Dashboard",
                subtitle: "Overview of today's attendance"
            },

            studentsSection: {
                title: "Students",
                subtitle: "Manage all registered students"
            },

            attendanceSection: {
                title: "Mark Attendance",
                subtitle: "Record student attendance"
            },

            recordsSection: {
                title: "Attendance Records",
                subtitle: "View attendance history"
            },

            reportsSection: {
                title: "Attendance Reports",
                subtitle: "Analyze student attendance"
            },

            profileSection: {
                title: "Profile",
                subtitle: "Manage your account information"
            },

            settingsSection: {
                title: "Settings",
                subtitle: "Configure Attendance Desk"
            }
        };

        const data = pageData[sectionId];

        if (data) {

            const title = document.getElementById("pageTitle");
            const subtitle = document.getElementById("pageSubtitle");

            if (title) {
                title.textContent = data.title;
            }

            if (subtitle) {
                subtitle.textContent = data.subtitle;
            }
        }

        /* Refresh section data */
        if (sectionId === "dashboardSection") {
            if (typeof renderDashboard === "function") {
                renderDashboard();
            }
        }

        if (sectionId === "studentsSection") {
            if (typeof renderStudents === "function") {
                renderStudents();
            }
        }

        if (sectionId === "recordsSection") {
            if (typeof renderRecords === "function") {
                renderRecords();
            }
        }

        if (sectionId === "reportsSection") {
            if (typeof renderReports === "function") {
                renderReports();
            }
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    /* Sidebar navigation */

    navItems.forEach(item => {

        item.addEventListener("click", function (event) {

            event.preventDefault();

            const sectionId = this.dataset.section;

            openSection(sectionId);

        });

    });


    /* Quick Action buttons */

    document.querySelectorAll("[data-target]").forEach(button => {

        button.addEventListener("click", function (event) {

            event.preventDefault();

            const sectionId = this.dataset.target;

            openSection(sectionId);

        });

    });


    /* Add Student button */

    const addStudentBtn =
        document.getElementById("addStudentBtn");

    if (addStudentBtn) {

        addStudentBtn.addEventListener("click", function () {

            if (typeof openStudentModal === "function") {
                openStudentModal();
            }

        });

    }


    /* Load Attendance */

    const loadStudentsBtn =
        document.getElementById("loadStudentsBtn");

    if (loadStudentsBtn) {

        loadStudentsBtn.addEventListener("click", function () {

            if (typeof loadAttendanceStudents === "function") {
                loadAttendanceStudents();
            }

        });

    }


    /* Mark All Present */

    const markAllPresent =
        document.getElementById("markAllPresent");

    if (markAllPresent) {

        markAllPresent.addEventListener("click", function () {

            if (typeof markAll === "function") {
                markAll("Present");
            }

        });

    }


    /* Mark All Absent */

    const markAllAbsent =
        document.getElementById("markAllAbsent");

    if (markAllAbsent) {

        markAllAbsent.addEventListener("click", function () {

            if (typeof markAll === "function") {
                markAll("Absent");
            }

        });

    }


    /* Save Attendance */

    const saveAttendanceBtn =
        document.getElementById("saveAttendanceBtn");

    if (saveAttendanceBtn) {

        saveAttendanceBtn.addEventListener("click", function () {

            if (typeof saveAttendance === "function") {
                saveAttendance();
            }

        });

    }


    /* Filter Records */

    const filterRecordsBtn =
        document.getElementById("filterRecordsBtn");

    if (filterRecordsBtn) {

        filterRecordsBtn.addEventListener("click", function () {

            if (typeof renderRecords === "function") {
                renderRecords();
            }

        });

    }


    /* Print Report */

    const printReportBtn =
        document.getElementById("printReportBtn");

    if (printReportBtn) {

        printReportBtn.addEventListener("click", function () {

            window.print();

        });

    }


    /* Logout */

    const logoutBtn =
        document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener("click", function () {

            localStorage.removeItem("attendanceDeskUser");
            localStorage.removeItem("attendanceDeskRemember");

            const mainApp =
                document.getElementById("mainApp");

            const loginPage =
                document.getElementById("loginPage");

            if (mainApp) {
                mainApp.classList.add("hidden");
            }

            if (loginPage) {
                loginPage.classList.remove("hidden");
            }

        });

    }


    /* Close student modal */

    const closeStudentModal =
        document.getElementById("closeStudentModal");

    if (closeStudentModal) {

        closeStudentModal.addEventListener("click", function () {

            if (typeof closeStudentModalWindow === "function") {
                closeStudentModalWindow();
            }

        });

    }


    /* Cancel student modal */

    const cancelStudentBtn =
        document.getElementById("cancelStudentBtn");

    if (cancelStudentBtn) {

        cancelStudentBtn.addEventListener("click", function () {

            if (typeof closeStudentModalWindow === "function") {
                closeStudentModalWindow();
            }

        });

    }


    console.log("Attendance Desk buttons initialized successfully.");

});