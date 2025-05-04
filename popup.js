// Check backend server status
async function checkServerStatus() {
    try {
        const response = await fetch('http://localhost:8080/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                context: { title: '', metaDescription: '', mainContent: '' },
                inputType: 'input',
                inputId: 'test',
                inputName: 'test',
                placeholder: 'test'
            })
        });
        
        const statusDiv = document.getElementById('status');
        statusDiv.className = 'status connected';
        statusDiv.textContent = 'Backend server: Connected';
    } catch (error) {
        const statusDiv = document.getElementById('status');
        statusDiv.className = 'status disconnected';
        statusDiv.textContent = 'Backend server: Disconnected';
    }
}

// Check status when popup opens
checkServerStatus(); 