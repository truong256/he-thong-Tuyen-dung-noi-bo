const users = [
    {
        id: 1,
        username: "admin",
        name: "Nguyễn Văn An",
        email: "an.nguyen@company.vn",
        department: "Ban quản trị",
        roles: ["ADMIN", "HR_MANAGER"],
        status: "ACTIVE"
    },
    {
        id: 2,
        username: "minh.tran",
        name: "Trần Minh",
        email: "minh.tran@company.vn",
        department: "Phòng Nhân sự",
        roles: ["RECRUITER", "INTERVIEWER"],
        status: "ACTIVE"
    },
    {
        id: 3,
        username: "thanh.le",
        name: "Lê Thanh",
        email: "thanh.le@company.vn",
        department: "Phòng Kỹ thuật",
        roles: ["HIRING_MANAGER", "INTERVIEWER"],
        status: "ACTIVE"
    },
    {
        id: 4,
        username: "hoa.pham",
        name: "Phạm Ngọc Hoa",
        email: "hoa.pham@company.vn",
        department: "Phòng Nhân sự",
        roles: ["HR_MANAGER", "APPROVER"],
        status: "ACTIVE"
    },
    {
        id: 5,
        username: "tuan.hoang",
        name: "Hoàng Tuấn",
        email: "tuan.hoang@company.vn",
        department: "Phòng Kinh doanh",
        roles: ["HIRING_MANAGER", "INTERVIEWER"],
        status: "ACTIVE"
    },
    {
        id: 6,
        username: "candidate01",
        name: "Nguyễn Minh Đức",
        email: "duc.nguyen@gmail.com",
        department: "Ứng viên",
        roles: ["CANDIDATE"],
        status: "ACTIVE"
    }
];

const roleNames = {
    ADMIN: "ADMIN",
    RECRUITER: "RECRUITER",
    HIRING_MANAGER: "HIRING MANAGER",
    INTERVIEWER: "INTERVIEWER",
    HR_MANAGER: "HR MANAGER",
    APPROVER: "APPROVER",
    CANDIDATE: "CANDIDATE"
};

let selectedUser = null;


function getInitials(name) {

    const words = name.trim().split(" ");

    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }

    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();
}


function roleClass(role) {

    if (role === "ADMIN") {
        return "admin";
    }

    if (
        role === "INTERVIEWER" ||
        role === "HR_MANAGER"
    ) {
        return "green";
    }

    if (
        role === "HIRING_MANAGER" ||
        role === "APPROVER"
    ) {
        return "orange";
    }

    return "";
}


function renderUsers(list = users) {

    const table = document.getElementById("userTable");

    table.innerHTML = "";

    list.forEach(user => {

        const tr = document.createElement("tr");

        const rolesHtml = user.roles
            .map(role => `
                <span class="role-badge ${roleClass(role)}">
                    ${roleNames[role] || role}
                </span>
            `)
            .join("");

        tr.innerHTML = `
            <td>
                <div class="user-cell">

                    <div class="avatar">
                        ${getInitials(user.name)}
                    </div>

                    <div>
                        <div class="user-name">
                            ${user.name}
                        </div>

                        <div class="user-id">
                            @${user.username}
                        </div>
                    </div>

                </div>
            </td>

            <td>
                <span class="email">
                    ${user.email}
                </span>
            </td>

            <td>
                <span class="department">
                    ${user.department}
                </span>
            </td>

            <td>
                <div class="role-list">
                    ${rolesHtml}
                </div>
            </td>

            <td>
                <span class="status">
                    Đang hoạt động
                </span>
            </td>

            <td>

                <button
                    class="action-btn"
                    title="Quản lý vai trò"
                    onclick="openRoleModal(${user.id})"
                >
                    ⚙
                </button>

            </td>
        `;

        table.appendChild(tr);
    });

    document.getElementById("resultText").textContent =
        `Hiển thị ${list.length} người dùng`;

    document.getElementById("totalUsers").textContent =
        users.length;

    const totalRoleCount =
        users.reduce(
            (total, user) => total + user.roles.length,
            0
        );

    document.getElementById("totalRoles").textContent =
        totalRoleCount;
}


function searchUsers() {

    const keyword =
        document
            .getElementById("searchInput")
            .value
            .toLowerCase()
            .trim();

    const selectedRole =
        document
            .getElementById("roleFilter")
            .value;

    const filtered = users.filter(user => {

        const matchesKeyword =
            user.name.toLowerCase().includes(keyword) ||
            user.username.toLowerCase().includes(keyword) ||
            user.email.toLowerCase().includes(keyword);

        const matchesRole =
            !selectedRole ||
            user.roles.includes(selectedRole);

        return matchesKeyword && matchesRole;
    });

    renderUsers(filtered);
}


function openRoleModal(id) {

    selectedUser =
        users.find(user => user.id === id);

    if (!selectedUser) {
        return;
    }

    document.getElementById("modalName").textContent =
        selectedUser.name;

    document.getElementById("modalEmail").textContent =
        selectedUser.email;

    document.getElementById("modalAvatar").textContent =
        getInitials(selectedUser.name);

    renderCurrentRoles();

    document
        .querySelectorAll(".role-option input")
        .forEach(input => {

            input.checked =
                selectedUser.roles.includes(input.value);
        });

    document
        .getElementById("roleModal")
        .classList.add("show");
}


function closeRoleModal() {

    document
        .getElementById("roleModal")
        .classList.remove("show");

    selectedUser = null;
}


function renderCurrentRoles() {

    const container =
        document.getElementById("currentRoles");

    container.innerHTML = "";

    if (!selectedUser.roles.length) {

        container.innerHTML = `
            <span style="font-size:10px;color:#999">
                Chưa có vai trò
            </span>
        `;

        return;
    }

    selectedUser.roles.forEach(role => {

        const item =
            document.createElement("span");

        item.className = "current-role";

        item.innerHTML = `
            ${roleNames[role] || role}

            <button
                onclick="removeRole('${role}')"
                title="Thu hồi vai trò"
            >
                ×
            </button>
        `;

        container.appendChild(item);
    });
}


function removeRole(role) {

    if (!selectedUser) {
        return;
    }

    /*
     * S1-09:
     * Không cho ADMIN tự thu hồi ADMIN.
     */

    if (
        selectedUser.username === "admin" &&
        role === "ADMIN"
    ) {

        showToast(
            "Không thể thực hiện",
            "Bạn không thể tự thu hồi vai trò ADMIN.",
            true
        );

        return;
    }

    selectedUser.roles =
        selectedUser.roles.filter(
            item => item !== role
        );

    const checkbox =
        document.querySelector(
            `.role-option input[value="${role}"]`
        );

    if (checkbox) {
        checkbox.checked = false;
    }

    renderCurrentRoles();

    renderUsers();

    showToast(
        "Thu hồi vai trò",
        `Đã thu hồi ${roleNames[role]} thành công.`
    );
}


function saveRoles() {

    if (!selectedUser) {
        return;
    }

    const selectedRoles =
        Array.from(
            document.querySelectorAll(
                ".role-option input:checked"
            )
        ).map(input => input.value);


    /*
     * Acceptance Criterion:
     * Không được tự thu hồi ADMIN.
     */

    if (
        selectedUser.username === "admin" &&
        selectedUser.roles.includes("ADMIN") &&
        !selectedRoles.includes("ADMIN")
    ) {

        showToast(
            "Không thể cập nhật",
            "Bạn không thể tự thu hồi vai trò ADMIN.",
            true
        );

        return;
    }


    selectedUser.roles = selectedRoles;

    renderCurrentRoles();

    renderUsers();

    showToast(
        "Cập nhật thành công",
        `Đã cập nhật ${selectedUser.name}.`
    );
}


function showToast(
    title,
    message,
    isError = false
) {

    const toast =
        document.getElementById("toast");

    const titleElement =
        document.getElementById("toastTitle");

    const messageElement =
        document.getElementById("toastMessage");

    titleElement.textContent = title;

    messageElement.textContent = message;

    const icon =
        toast.querySelector(".toast-icon");

    if (isError) {

        icon.textContent = "!";
        icon.style.background = "#fff0f0";
        icon.style.color = "#d84e59";

    } else {

        icon.textContent = "✓";
        icon.style.background = "#e7f8f1";
        icon.style.color = "#1d9b72";
    }

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}


function openAddUser() {

    showToast(
        "Chức năng đang hoàn thiện",
        "Form tạo người dùng sẽ được kết nối với backend."
    );
}


document
    .getElementById("roleModal")
    .addEventListener("click", event => {

        if (event.target.id === "roleModal") {
            closeRoleModal();
        }

    });


renderUsers();