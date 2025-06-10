
#!/bin/bash

create_main_files() {
    # Create main CRM application file
    cat > $CRM_PATH/index.php << 'EOF'
<?php
session_start();
require_once 'includes/auth.php';
require_once 'includes/database.php';

// Check if user is logged in
if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$user = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreePBX CRM Integration</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="assets/style.css" rel="stylesheet">
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <nav class="col-md-2 d-none d-md-block bg-dark sidebar">
                <div class="sidebar-sticky">
                    <h5 class="text-white p-3">FreePBX CRM</h5>
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#leads" onclick="loadSection('leads')">
                                <i class="fas fa-users"></i> Leads
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#calls" onclick="loadSection('calls')">
                                <i class="fas fa-phone"></i> Call Center
                            </a>
                        </li>
                        <?php if ($user['role'] === 'manager' || $user['role'] === 'administrator'): ?>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#reports" onclick="loadSection('reports')">
                                <i class="fas fa-chart-bar"></i> Reports
                            </a>
                        </li>
                        <?php endif; ?>
                        <?php if ($user['role'] === 'administrator'): ?>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#users" onclick="loadSection('users')">
                                <i class="fas fa-user-cog"></i> Users
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#settings" onclick="loadSection('settings')">
                                <i class="fas fa-cog"></i> Settings
                            </a>
                        </li>
                        <?php endif; ?>
                    </ul>
                    <div class="mt-auto p-3">
                        <div class="text-white-50">
                            <small>Welcome, <?= htmlspecialchars($user['first_name']) ?></small><br>
                            <small>Role: <?= htmlspecialchars($user['role']) ?></small>
                        </div>
                        <a href="logout.php" class="btn btn-outline-light btn-sm mt-2">Logout</a>
                    </div>
                </div>
            </nav>

            <!-- Main content -->
            <main role="main" class="col-md-10 ml-sm-auto px-4">
                <div id="main-content">
                    <!-- Content will be loaded here -->
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/app.js"></script>
</body>
</html>
EOF

    # Create login page
    cat > $CRM_PATH/login.php << 'EOF'
<?php
session_start();
require_once 'includes/auth.php';

if (isLoggedIn()) {
    header('Location: index.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (login($username, $password)) {
        header('Location: index.php');
        exit;
    } else {
        $error = 'Invalid username or password';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - FreePBX CRM</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-4">
                <div class="card mt-5">
                    <div class="card-header">
                        <h4 class="text-center">FreePBX CRM Login</h4>
                    </div>
                    <div class="card-body">
                        <?php if ($error): ?>
                            <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
                        <?php endif; ?>
                        <form method="POST">
                            <div class="mb-3">
                                <label for="username" class="form-label">Username</label>
                                <input type="text" class="form-control" id="username" name="username" required>
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="password" name="password" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Login</button>
                        </form>
                        <div class="mt-3 text-center">
                            <small class="text-muted">
                                Default login: admin / admin123
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
EOF

    # Create logout script
    cat > $CRM_PATH/logout.php << 'EOF'
<?php
session_start();
require_once 'includes/auth.php';
logout();
header('Location: login.php');
exit;
?>
EOF
}

create_api_files() {
    # Create Click-to-Dial API
    cat > $CRM_PATH/api/click_to_dial.php << 'EOF'
<?php
require_once '../includes/auth.php';
require_once '../includes/asterisk.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$phone = $input['phone'] ?? '';
$extension = $input['extension'] ?? '';

if (empty($phone) || empty($extension)) {
    http_response_code(400);
    echo json_encode(['error' => 'Phone and extension required']);
    exit;
}

try {
    $result = initiateCall($extension, $phone);
    if ($result) {
        echo json_encode(['success' => true, 'message' => 'Call initiated']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to initiate call']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>
EOF

    # Create leads API
    cat > $CRM_PATH/api/leads.php << 'EOF'
<?php
require_once '../includes/auth.php';
require_once '../includes/database.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$db = getDatabase();
$stmt = $db->query("SELECT * FROM leads ORDER BY priority DESC, created_at DESC LIMIT 50");
$leads = $stmt->fetchAll();

echo json_encode($leads);
?>
EOF
}

create_includes_files() {
    # Create Asterisk AMI interface
    cat > $CRM_PATH/includes/asterisk.php << 'EOF'
<?php
function initiateCall($extension, $phone) {
    $config = require '../config/asterisk.php';
    $ami = $config['ami'];
    
    $socket = fsockopen($ami['host'], $ami['port'], $errno, $errstr, $ami['timeout']);
    
    if (!$socket) {
        throw new Exception("Cannot connect to Asterisk: $errstr ($errno)");
    }
    
    // Read welcome message
    fgets($socket);
    
    // Login
    $login = "Action: Login\r\n";
    $login .= "Username: {$ami['username']}\r\n";
    $login .= "Secret: {$ami['password']}\r\n\r\n";
    
    fputs($socket, $login);
    
    // Read login response
    $response = '';
    while (($line = fgets($socket)) !== false) {
        $response .= $line;
        if (trim($line) === '') break;
    }
    
    if (strpos($response, 'Success') === false) {
        fclose($socket);
        throw new Exception('AMI login failed');
    }
    
    // Initiate call
    $originate = "Action: Originate\r\n";
    $originate .= "Channel: SIP/$extension\r\n";
    $originate .= "Context: default\r\n";
    $originate .= "Exten: $phone\r\n";
    $originate .= "Priority: 1\r\n";
    $originate .= "CallerID: CRM <$extension>\r\n";
    $originate .= "Timeout: 30000\r\n\r\n";
    
    fputs($socket, $originate);
    
    // Read originate response
    $response = '';
    while (($line = fgets($socket)) !== false) {
        $response .= $line;
        if (trim($line) === '') break;
    }
    
    // Logout
    fputs($socket, "Action: Logoff\r\n\r\n");
    fclose($socket);
    
    return strpos($response, 'Success') !== false;
}
?>
EOF

    # Create authentication system
    cat > $CRM_PATH/includes/auth.php << 'EOF'
<?php
require_once 'database.php';

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    
    $db = getDatabase();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ? AND active = 1");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch();
}

function login($username, $password) {
    $db = getDatabase();
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ? AND active = 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        return true;
    }
    
    return false;
}

function logout() {
    session_destroy();
}
?>
EOF

    # Create database connection
    cat > $CRM_PATH/includes/database.php << 'EOF'
<?php
function getDatabase() {
    static $pdo = null;
    
    if ($pdo === null) {
        $config = require '../config/database.php';
        $dsn = "mysql:host={$config['host']};dbname={$config['database']};charset={$config['charset']}";
        $pdo = new PDO($dsn, $config['username'], $config['password'], $config['options']);
    }
    
    return $pdo;
}
?>
EOF
}

create_asset_files() {
    # Create CSS file
    cat > $CRM_PATH/assets/style.css << 'EOF'
.sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 100;
    padding: 0;
    box-shadow: inset -1px 0 0 rgba(0, 0, 0, .1);
}

.sidebar-sticky {
    position: sticky;
    top: 0;
    height: 100vh;
    padding-top: 0;
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.nav-link {
    color: rgba(255, 255, 255, .75);
}

.nav-link:hover {
    color: rgba(255, 255, 255, 1);
}

.click-to-dial {
    cursor: pointer;
    transition: all 0.2s;
}

.click-to-dial:hover {
    transform: scale(1.1);
}

.lead-card {
    transition: all 0.2s;
}

.lead-card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.status-new { border-left: 4px solid #007bff; }
.status-contacted { border-left: 4px solid #28a745; }
.status-qualified { border-left: 4px solid #ffc107; }
.status-converted { border-left: 4px solid #28a745; }
.status-do_not_call { border-left: 4px solid #dc3545; }

.priority-high { background: rgba(220, 53, 69, 0.1); }
.priority-medium { background: rgba(255, 193, 7, 0.1); }
.priority-low { background: rgba(108, 117, 125, 0.1); }
EOF

    # Create JavaScript file
    cat > $CRM_PATH/assets/app.js << 'EOF'
// Main application JavaScript

function loadSection(section) {
    const content = document.getElementById('main-content');
    
    switch(section) {
        case 'leads':
            loadLeads();
            break;
        case 'calls':
            loadCalls();
            break;
        case 'reports':
            loadReports();
            break;
        case 'users':
            loadUsers();
            break;
        case 'settings':
            loadSettings();
            break;
        default:
            loadLeads();
    }
}

function loadLeads() {
    fetch('api/leads.php')
        .then(response => response.json())
        .then(data => {
            let html = '<h2>Lead Management</h2>';
            html += '<div class="row">';
            
            data.forEach(lead => {
                html += `
                    <div class="col-md-4 mb-3">
                        <div class="card lead-card status-${lead.status} priority-${lead.priority}">
                            <div class="card-body">
                                <h5 class="card-title">${lead.first_name} ${lead.last_name}</h5>
                                <p class="card-text">
                                    <i class="fas fa-phone"></i> ${lead.phone}<br>
                                    <i class="fas fa-envelope"></i> ${lead.email}<br>
                                    <i class="fas fa-building"></i> ${lead.company}
                                </p>
                                <div class="d-flex justify-content-between">
                                    <span class="badge bg-secondary">${lead.status}</span>
                                    <button class="btn btn-success btn-sm click-to-dial" 
                                            onclick="makeCall('${lead.phone}')">
                                        <i class="fas fa-phone"></i> Call
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            document.getElementById('main-content').innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading leads:', error);
            document.getElementById('main-content').innerHTML = '<div class="alert alert-danger">Error loading leads</div>';
        });
}

function makeCall(phone) {
    const extension = prompt('Enter your extension:');
    if (!extension) return;
    
    fetch('api/click_to_dial.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            phone: phone,
            extension: extension
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Call initiated successfully!');
        } else {
            alert('Failed to initiate call: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error making call:', error);
        alert('Error making call');
    });
}

// Load leads by default when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadLeads();
});
EOF
}
