// global variables
let currentUser = null;

// storage key for localStorage
const STORAGE_KEY = 'ipt_demo_v1';

// database object to hold all data
window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};

// when page loads, run this
document.addEventListener('DOMContentLoaded', () => {
    
    // load data from localStorage
    loadFromStorage();

    // setup all event listeners
    initializeEventListeners();

    // if no hash in url, go to home
    if (!window.location.hash) {
        window.location.hash = '#/';
    }

    // check if user was logged in before (session restore)
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
        // try to find the user with this token
        const user = window.db.accounts.find(acc => acc.email === authToken && acc.verified);
        if (user) {
            // user found, log them in
            setAuthState(true, user);
        } else {
            // token is invalid, remove it
            localStorage.removeItem('auth_token');
        }
    }

    // show the current page based on hash
    handleRouting();

    // listen for hash changes (when user clicks links)
    window.addEventListener('hashchange', handleRouting);
});

// load data from localStorage
function loadFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            // data exists, parse it
            window.db = JSON.parse(stored);
        } else {
            // no data, create default
            seedDatabase();
        }
    } catch (e) {
        // if error, reset database
        console.error('Error loading data:', e);
        seedDatabase();
    }
}

// save data to localStorage
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
    } catch (e) {
        console.error('Error saving data:', e);
        showToast('Error saving data', 'danger');
    }
}

// create initial data
function seedDatabase() {
    window.db = {
        accounts: [
            {
                id: generateId(),
                firstName: 'Admin',
                lastName: '',
                email: 'admin@example.com',
                password: 'Password123!',
                role: 'Admin',
                verified: true
            }
        ],
        departments: [
            { id: generateId(), name: 'Engineering', description: 'Software team' },
            { id: generateId(), name: 'HR', description: 'Human Resources' }
        ],
        employees: [],
        requests: []
    };
    saveToStorage();
}

// navigate to different page
function navigateTo(hash) {
    window.location.hash = hash;
}

// main routing function - handles page navigation
function handleRouting() {
    // get current hash
    const hash = window.location.hash || '#/';
    const route = hash.substring(2); // remove '#/'

    // hide all pages first
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // check if route needs login
    const protectedRoutes = ['profile', 'employees', 'departments', 'accounts', 'requests'];
    const adminRoutes = ['employees', 'departments', 'accounts'];

    // if not logged in and trying to access protected page
    if (protectedRoutes.includes(route) && !currentUser) {
        showToast('Please log in first', 'warning');
        navigateTo('#/login');
        return;
    }

    // if not admin and trying to access admin page
    if (adminRoutes.includes(route) && (!currentUser || currentUser.role !== 'Admin')) {
        showToast('Access denied. Admin only.', 'danger');
        navigateTo('#/');
        return;
    }

    // determine which page to show
    let pageId = '';
    switch (route) {
        case '':
        case '/':
            pageId = 'home-page';
            break;
        case 'register':
            pageId = 'register-page';
            break;
        case 'verify-email':
            pageId = 'verify-email-page';
            // show email on verification page
            const unverifiedEmail = localStorage.getItem('unverified_email');
            if (unverifiedEmail) {
                document.getElementById('verify-email-display').textContent = unverifiedEmail;
            }
            break;
        case 'login':
            pageId = 'login-page';
            // show success message if coming from verification
            if (localStorage.getItem('email_verified') === 'true') {
                document.getElementById('login-success-alert').classList.remove('d-none');
                localStorage.removeItem('email_verified');
            }
            break;
        case 'profile':
            pageId = 'profile-page';
            renderProfile();
            break;
        case 'employees':
            pageId = 'employees-page';
            renderEmployeesList();
            break;
        case 'departments':
            pageId = 'departments-page';
            renderDepartmentsList();
            break;
        case 'accounts':
            pageId = 'accounts-page';
            renderAccountsList();
            break;
        case 'requests':
            pageId = 'requests-page';
            renderRequestsList();
            break;
        default:
            pageId = 'home-page';
    }

    // show the page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }
}

// update authentication state
function setAuthState(isAuth, user = null) {
    currentUser = user;
    const body = document.body;

    if (isAuth && user) {
        // user is logged in
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');

        // check if admin
        if (user.role === 'Admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }

        // update navbar with user name
        // update navbar with user name
        const displayName = user.lastName ? user.firstName + ' ' + user.lastName : user.firstName;
        document.getElementById('username-display').textContent = displayName;
    } else {
        // user is logged out
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
        currentUser = null;
    }
}

// setup all event listeners
function initializeEventListeners() {
    // registration
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // login/logout
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // email verification
    document.getElementById('simulate-verify-btn').addEventListener('click', handleVerifyEmail);

    // employees
    document.getElementById('add-employee-btn').addEventListener('click', showEmployeeForm);
    document.getElementById('cancel-employee-btn').addEventListener('click', hideEmployeeForm);
    document.getElementById('employee-form').addEventListener('submit', handleEmployeeSubmit);

    // departments
    document.getElementById('add-department-btn').addEventListener('click', () => {
        alert('Department creation not fully implemented in this prototype');
    });

    // accounts
    document.getElementById('add-account-btn').addEventListener('click', showAccountForm);
    document.getElementById('cancel-account-btn').addEventListener('click', hideAccountForm);
    document.getElementById('account-form').addEventListener('submit', handleAccountSubmit);

    // requests
    document.getElementById('new-request-btn').addEventListener('click', showRequestModal);
    document.getElementById('add-item-btn').addEventListener('click', addRequestItem);
    document.getElementById('request-form').addEventListener('submit', handleRequestSubmit);
}

// handle registration
function handleRegister(e) {
    e.preventDefault();

    // get form values
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    // check if email already exists
    if (window.db.accounts.find(acc => acc.email === email)) {
        showToast('Email already registered', 'danger');
        return;
    }

    // check password length
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'danger');
        return;
    }

    // create new account
    const newAccount = {
        id: generateId(),
        firstName,
        lastName,
        email,
        password,
        role: 'User',
        verified: false
    };

    // add to database
    window.db.accounts.push(newAccount);
    saveToStorage();

    // save email for verification page
    localStorage.setItem('unverified_email', email);

    showToast('Account created! Please verify your email.', 'success');
    navigateTo('#/verify-email');
}

// simulate email verification
function handleVerifyEmail() {
    const email = localStorage.getItem('unverified_email');
    if (!email) {
        showToast('No pending verification', 'warning');
        return;
    }

    // find account
    const account = window.db.accounts.find(acc => acc.email === email);
    if (account) {
        // mark as verified
        account.verified = true;
        saveToStorage();

        // cleanup
        localStorage.removeItem('unverified_email');
        localStorage.setItem('email_verified', 'true');

        showToast('Email verified successfully!', 'success');
        navigateTo('#/login');
    } else {
        showToast('Account not found', 'danger');
    }
}

// handle login
function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    // find matching account
    const account = window.db.accounts.find(
        acc => acc.email === email && acc.password === password && acc.verified
    );

    if (account) {
        // login successful
        localStorage.setItem('auth_token', email);
        setAuthState(true, account);
        showToast('Login successful!', 'success');
        navigateTo('#/profile');
    } else {
        // login failed
        showToast('Invalid credentials or unverified email', 'danger');
    }
}

// handle logout
function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('auth_token');
    setAuthState(false);
    showToast('Logged out successfully', 'info');
    navigateTo('#/');
}

// render profile page
function renderProfile() {
    if (!currentUser) return;

    const html = `
        <div class="mb-3">
            <h4>${currentUser.firstName} ${currentUser.lastName}</h4>
        </div>
        <div class="mb-2">
            <strong>Email:</strong> ${currentUser.email}
        </div>
        <div class="mb-3">
            <strong>Role:</strong> ${currentUser.role}
        </div>
        <button class="btn btn-primary" onclick="alert('Dummy button only!')">Edit Profile</button>
    `;

    document.getElementById('profile-content').innerHTML = html;
}


// render accounts list
function renderAccountsList() {
    const accounts = window.db.accounts;
    let html = '';

    if (accounts.length === 0) {
        html = '<div class="alert alert-info">No accounts found.</div>';
    } else {
        html = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Verified</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        accounts.forEach(acc => {
            const verifiedIcon = acc.verified ? '✅' : '—';
            
            html += `
                <tr>
                    <td>${acc.firstName} ${acc.lastName}</td>
                    <td>${acc.email}</td>
                    <td>${acc.role}</td>
                    <td>${verifiedIcon}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="editAccount('${acc.id}')">Edit</button>
                        <button class="btn btn-sm btn-warning" onclick="resetPassword('${acc.id}')">Reset Password</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAccount('${acc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
    }

    document.getElementById('accounts-list').innerHTML = html;
}

// show account form
function showAccountForm(accountId = null) {
    const container = document.getElementById('account-form-container');
    const form = document.getElementById('account-form');

    if (accountId) {
        // editing
        const acc = window.db.accounts.find(a => a.id === accountId);
        if (acc) {
            document.getElementById('acc-firstname').value = acc.firstName;
            document.getElementById('acc-lastname').value = acc.lastName;
            document.getElementById('acc-email').value = acc.email;
            document.getElementById('acc-password').value = acc.password;
            document.getElementById('acc-role').value = acc.role;
            document.getElementById('acc-verified').checked = acc.verified;
            form.dataset.editId = accountId;
        }
    } else {
        // adding new
        form.reset();
        delete form.dataset.editId;
    }

    container.classList.remove('d-none');
}

// hide account form
function hideAccountForm() {
    document.getElementById('account-form-container').classList.add('d-none');
    document.getElementById('account-form').reset();
}

// submit account form
function handleAccountSubmit(e) {
    e.preventDefault();

    const firstName = document.getElementById('acc-firstname').value.trim();
    const lastName = document.getElementById('acc-lastname').value.trim();
    const email = document.getElementById('acc-email').value.trim().toLowerCase();
    const password = document.getElementById('acc-password').value;
    const role = document.getElementById('acc-role').value;
    const verified = document.getElementById('acc-verified').checked;

    // validate password
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'danger');
        return;
    }

    const form = document.getElementById('account-form');
    const editId = form.dataset.editId;

    if (editId) {
        // updating existing account
        const acc = window.db.accounts.find(a => a.id === editId);
        if (acc) {
            // check if email is taken by another account
            const emailTaken = window.db.accounts.find(a => a.email === email && a.id !== editId);
            if (emailTaken) {
                showToast('Email already in use by another account', 'danger');
                return;
            }

            acc.firstName = firstName;
            acc.lastName = lastName;
            acc.email = email;
            acc.password = password;
            acc.role = role;
            acc.verified = verified;
        }
        showToast('Account updated successfully', 'success');
    } else {
        // creating new account
        if (window.db.accounts.find(a => a.email === email)) {
            showToast('Email already exists', 'danger');
            return;
        }

        const newAccount = {
            id: generateId(),
            firstName,
            lastName,
            email,
            password,
            role,
            verified
        };
        window.db.accounts.push(newAccount);
        showToast('Account created successfully', 'success');
    }

    saveToStorage();
    hideAccountForm();
    renderAccountsList();
}

// edit account
function editAccount(id) {
    showAccountForm(id);
}

// reset password
function resetPassword(id) {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (newPassword === null) return; // user cancelled
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'danger');
        return;
    }

    const acc = window.db.accounts.find(a => a.id === id);
    if (acc) {
        acc.password = newPassword;
        saveToStorage();
        showToast('Password reset successfully', 'success');
    }
}

// delete account
function deleteAccount(id) {
    // don't let user delete their own account
    if (currentUser && currentUser.id === id) {
        showToast('Cannot delete your own account', 'danger');
        return;
    }

    if (confirm('Delete this account? This action cannot be undone.')) {
        window.db.accounts = window.db.accounts.filter(a => a.id !== id);
        saveToStorage();
        showToast('Account deleted', 'info');
        renderAccountsList();
    }
}


// render departments list
function renderDepartmentsList() {
    const departments = window.db.departments;
    let html = '';

    if (departments.length === 0) {
        html = '<div class="alert alert-info">No departments found.</div>';
    } else {
        html = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        departments.forEach(dept => {
            html += `
                <tr>
                    <td>${dept.name}</td>
                    <td>${dept.description}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="alert('Edit not implemented')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="alert('Delete not implemented')">Delete</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
    }

    document.getElementById('departments-list').innerHTML = html;
}

// render employees list
function renderEmployeesList() {
    const employees = window.db.employees;
    let html = '';

    if (employees.length === 0) {
        html = '<div class="alert alert-info">No employees found.</div>';
    } else {
        html = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Position</th>
                        <th>Dept</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        employees.forEach(emp => {
            // get user info
            const user = window.db.accounts.find(acc => acc.email === emp.userEmail);
            const userName = user ? `${user.firstName} ${user.lastName}` : emp.userEmail;
            
            // get department info
            const dept = window.db.departments.find(d => d.id === emp.departmentId);
            const deptName = dept ? dept.name : 'N/A';

            html += `
                <tr>
                    <td>${emp.employeeId}</td>
                    <td>${userName}</td>
                    <td>${emp.position}</td>
                    <td>${deptName}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="editEmployee('${emp.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
    }

    document.getElementById('employees-list').innerHTML = html;
}

// show employee form
function showEmployeeForm(employeeId = null) {
    const container = document.getElementById('employee-form-container');
    const form = document.getElementById('employee-form');

    // populate department dropdown
    const deptSelect = document.getElementById('emp-department');
    deptSelect.innerHTML = window.db.departments.map(dept =>
        `<option value="${dept.id}">${dept.name}</option>`
    ).join('');

    if (employeeId) {
        // editing existing employee
        const emp = window.db.employees.find(e => e.id === employeeId);
        if (emp) {
            document.getElementById('emp-id').value = emp.employeeId;
            document.getElementById('emp-email').value = emp.userEmail;
            document.getElementById('emp-position').value = emp.position;
            document.getElementById('emp-department').value = emp.departmentId;
            document.getElementById('emp-hiredate').value = emp.hireDate;
            form.dataset.editId = employeeId;
        }
    } else {
        // adding new employee
        form.reset();
        delete form.dataset.editId;
    }

    container.classList.remove('d-none');
}

// hide employee form
function hideEmployeeForm() {
    document.getElementById('employee-form-container').classList.add('d-none');
    document.getElementById('employee-form').reset();
}

// submit employee form
function handleEmployeeSubmit(e) {
    e.preventDefault();

    const employeeId = document.getElementById('emp-id').value.trim();
    const userEmail = document.getElementById('emp-email').value.trim().toLowerCase();
    const position = document.getElementById('emp-position').value.trim();
    const departmentId = document.getElementById('emp-department').value;
    const hireDate = document.getElementById('emp-hiredate').value;

    // check if user exists
    const user = window.db.accounts.find(acc => acc.email === userEmail);
    if (!user) {
        showToast('User email not found in accounts', 'danger');
        return;
    }

    const form = document.getElementById('employee-form');
    const editId = form.dataset.editId;

    if (editId) {
        // update existing
        const emp = window.db.employees.find(e => e.id === editId);
        if (emp) {
            emp.employeeId = employeeId;
            emp.userEmail = userEmail;
            emp.position = position;
            emp.departmentId = departmentId;
            emp.hireDate = hireDate;
        }
        showToast('Employee updated successfully', 'success');
    } else {
        // add new
        const newEmployee = {
            id: generateId(),
            employeeId,
            userEmail,
            position,
            departmentId,
            hireDate
        };
        window.db.employees.push(newEmployee);
        showToast('Employee added successfully', 'success');
    }

    saveToStorage();
    hideEmployeeForm();
    renderEmployeesList();
}

// edit employee
function editEmployee(id) {
    showEmployeeForm(id);
}

// delete employee
function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        window.db.employees = window.db.employees.filter(e => e.id !== id);
        saveToStorage();
        showToast('Employee deleted', 'info');
        renderEmployeesList();
    }
}

// render requests list
function renderRequestsList() {
    // only show current user's requests
    const userRequests = window.db.requests.filter(req => req.employeeEmail === currentUser.email);
    let html = '';

    if (userRequests.length === 0) {
        html = `
            <div class="alert alert-info">
                You have no requests yet.
                <br>
                <button class="btn btn-success mt-2" onclick="showRequestModal()">Create One</button>
            </div>
        `;
    } else {
        html = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Items</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        userRequests.forEach(req => {
            // color code status
            let statusClass = 'warning';
            if (req.status === 'Approved') statusClass = 'success';
            if (req.status === 'Rejected') statusClass = 'danger';

            // format items
            const itemsList = req.items.map(item => `${item.name} (${item.qty})`).join(', ');

            html += `
                <tr>
                    <td>${req.date}</td>
                    <td>${req.type}</td>
                    <td>${itemsList}</td>
                    <td><span class="badge bg-${statusClass}">${req.status}</span></td>
                </tr>
            `;
        });

        html += '</tbody></table>';
    }

    document.getElementById('requests-list').innerHTML = html;
}

// show request modal
function showRequestModal() {
    const modal = new bootstrap.Modal(document.getElementById('requestModal'));
    const form = document.getElementById('request-form');
    
    form.reset();

    // reset items to just one row
    document.getElementById('request-items').innerHTML = `
        <div class="input-group mb-2">
            <input type="text" class="form-control item-name" placeholder="Item name" required>
            <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" required>
            <button type="button" class="btn btn-danger remove-item" disabled>×</button>
        </div>
    `;

    modal.show();
}

// add item row to request form
function addRequestItem() {
    const container = document.getElementById('request-items');

    const newRow = document.createElement('div');
    newRow.className = 'input-group mb-2';
    newRow.innerHTML = `
        <input type="text" class="form-control item-name" placeholder="Item name" required>
        <input type="number" class="form-control item-qty" placeholder="Qty" value="1" min="1" required>
        <button type="button" class="btn btn-danger remove-item">×</button>
    `;

    // add click event to remove button
    newRow.querySelector('.remove-item').addEventListener('click', function() {
        newRow.remove();
    });

    container.appendChild(newRow);
}

// submit request
function handleRequestSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('req-type').value;

    // get all items
    const itemRows = document.querySelectorAll('#request-items .input-group');
    const items = [];

    itemRows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const qty = parseInt(row.querySelector('.item-qty').value);
        if (name && qty > 0) {
            items.push({ name, qty });
        }
    });

    // need at least one item
    if (items.length === 0) {
        showToast('Please add at least one item', 'danger');
        return;
    }

    // create request
    const newRequest = {
        id: generateId(),
        type,
        items,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        employeeEmail: currentUser.email
    };

    window.db.requests.push(newRequest);
    saveToStorage();

    showToast('Request submitted successfully', 'success');
    
    // close modal
    const modalElement = document.getElementById('requestModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    modalInstance.hide();
    
    renderRequestsList();
}

// generate unique id
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// show toast notification
function showToast(message, type = 'info') {
    // get or create container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // create toast
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    container.appendChild(toast);

    // remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 150);
    }, 2500);
}