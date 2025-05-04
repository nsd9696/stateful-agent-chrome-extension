// Function to get relevant context from the page
function getPageContext() {
    // Get the title
    const title = document.title;
    
    // Get meta description
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    
    // Get surrounding text content
    const mainContent = document.body.innerText.substring(0, 1000); // First 1000 characters
    
    return {
        title,
        metaDescription,
        mainContent
    };
}

// Function to create a chat window on the right side
function createChatWindow() {
    // Create chat container
    const chatContainer = document.createElement('div');
    chatContainer.className = 'ai-chat-container';
    
    // Create chat header with tab buttons
    const chatHeader = document.createElement('div');
    chatHeader.className = 'ai-chat-header';
    
    // Create tabs container
    const tabContainer = document.createElement('div');
    tabContainer.className = 'ai-tab-container';
    
    // Create chat tab
    const chatTab = document.createElement('button');
    chatTab.className = 'ai-tab active';
    chatTab.textContent = 'Chat';
    
    // Create files tab
    const filesTab = document.createElement('button');
    filesTab.className = 'ai-tab';
    filesTab.textContent = 'Files';
    
    // Create settings tab
    const settingsTab = document.createElement('button');
    settingsTab.className = 'ai-tab';
    settingsTab.textContent = 'Settings';
    
    tabContainer.appendChild(chatTab);
    tabContainer.appendChild(filesTab);
    tabContainer.appendChild(settingsTab);
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'ai-chat-toggle';
    toggleButton.textContent = '−';
    toggleButton.addEventListener('click', () => {
        if (chatBody.style.display === 'none') {
            chatBody.style.display = 'flex';
            toggleButton.textContent = '−';
        } else {
            chatBody.style.display = 'none';
            toggleButton.textContent = '+';
        }
    });
    
    chatHeader.appendChild(tabContainer);
    chatHeader.appendChild(toggleButton);
    
    // Create chat body
    const chatBody = document.createElement('div');
    chatBody.className = 'ai-chat-body';
    
    // Create chat interface
    const chatInterface = document.createElement('div');
    chatInterface.className = 'ai-chat-interface active';
    
    // Create messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'ai-chat-messages';
    
    // Create welcome message
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'ai-chat-message ai-message';
    welcomeMessage.textContent = 'Hello! How can I help you today?';
    messagesContainer.appendChild(welcomeMessage);
    
    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'ai-chat-input-container';
    
    const chatInput = document.createElement('input');
    chatInput.type = 'text';
    chatInput.className = 'ai-chat-input';
    chatInput.placeholder = 'Type your message...';
    
    const sendButton = document.createElement('button');
    sendButton.className = 'ai-chat-send';
    sendButton.textContent = 'Send';
    
    // Add event listeners for sending messages
    const sendMessage = async () => {
        const message = chatInput.value.trim();
        if (message) {
            // Add user message to chat
            const userMessageElem = document.createElement('div');
            userMessageElem.className = 'ai-chat-message user-message';
            userMessageElem.textContent = message;
            messagesContainer.appendChild(userMessageElem);
            
            // Clear input
            chatInput.value = '';
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Show thinking indicator
            const thinkingElem = document.createElement('div');
            thinkingElem.className = 'ai-chat-message ai-message thinking';
            thinkingElem.innerHTML = '<span class="dot-animation"><span>.</span><span>.</span><span>.</span></span>';
            messagesContainer.appendChild(thinkingElem);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            try {
                // Get page context
                const pageContext = getPageContext();
                
                // Send to backend
                const data = await fetchWithRetry('http://localhost:8080/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        context: pageContext
                    })
                });
                
                // Remove thinking indicator
                thinkingElem.remove();
                
                // Add AI response
                const aiMessageElem = document.createElement('div');
                aiMessageElem.className = 'ai-chat-message ai-message';
                aiMessageElem.textContent = data.response || "I'm sorry, I couldn't process that.";
                messagesContainer.appendChild(aiMessageElem);
            } catch (error) {
                console.error('Error sending message:', error);
                
                // Remove thinking indicator
                thinkingElem.remove();
                
                // Add error message
                const errorElem = document.createElement('div');
                errorElem.className = 'ai-chat-message ai-message error';
                errorElem.innerHTML = `
                    <strong>Server Error</strong><br>
                    The server is currently experiencing issues. It might be:<br>
                    - Server is still starting up<br>
                    - Event loop conflict<br><br>
                    Please try again in a few moments or check the server logs.
                `;
                messagesContainer.appendChild(errorElem);
            }
            
            // Scroll to bottom again
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    };
    
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    inputContainer.appendChild(chatInput);
    inputContainer.appendChild(sendButton);
    
    // Assemble chat interface
    chatInterface.appendChild(messagesContainer);
    chatInterface.appendChild(inputContainer);
    
    // Create files interface
    const filesInterface = document.createElement('div');
    filesInterface.className = 'ai-files-interface';
    
    // Create files list container
    const filesListContainer = document.createElement('div');
    filesListContainer.className = 'ai-files-list-container';
    
    // Create files header
    const filesHeader = document.createElement('div');
    filesHeader.className = 'ai-files-header';
    filesHeader.textContent = 'Files in .stateful_agent/data';
    
    // Create files list
    const filesList = document.createElement('div');
    filesList.className = 'ai-files-list';
    
    // Create loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'ai-loading-indicator';
    loadingIndicator.textContent = 'Loading files...';
    filesList.appendChild(loadingIndicator);
    
    // Create file upload section
    const uploadSection = document.createElement('div');
    uploadSection.className = 'ai-upload-section';
    
    const uploadHeader = document.createElement('div');
    uploadHeader.className = 'ai-upload-header';
    uploadHeader.textContent = 'Upload New File';
    
    const uploadForm = document.createElement('form');
    uploadForm.className = 'ai-upload-form';
    
    // Create a file input container with label
    const fileInputContainer = document.createElement('div');
    fileInputContainer.className = 'ai-file-input-container';
    
    const fileInputLabel = document.createElement('label');
    fileInputLabel.className = 'ai-file-input-label';
    fileInputLabel.htmlFor = 'ai-file-input';
    fileInputLabel.textContent = 'Choose Files';
    
    const fileInputText = document.createElement('span');
    fileInputText.className = 'ai-file-input-text';
    fileInputText.textContent = 'No files selected';
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'ai-file-input';
    fileInput.className = 'ai-file-input';
    fileInput.multiple = true;
    
    // Update the text when files are selected
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileInputText.textContent = `${fileInput.files.length} file(s) selected`;
        } else {
            fileInputText.textContent = 'No files selected';
        }
    });
    
    fileInputContainer.appendChild(fileInputLabel);
    fileInputContainer.appendChild(fileInput);
    fileInputContainer.appendChild(fileInputText);
    
    const uploadButton = document.createElement('button');
    uploadButton.type = 'submit';
    uploadButton.className = 'ai-upload-button';
    uploadButton.textContent = 'Upload & Process';
    
    const uploadStatus = document.createElement('div');
    uploadStatus.className = 'ai-upload-status';
    
    uploadForm.appendChild(fileInputContainer);
    uploadForm.appendChild(uploadButton);
    
    uploadSection.appendChild(uploadHeader);
    uploadSection.appendChild(uploadForm);
    uploadSection.appendChild(uploadStatus);
    
    // Assemble files list container
    filesListContainer.appendChild(filesHeader);
    filesListContainer.appendChild(filesList);
    
    // Assemble files interface
    filesInterface.appendChild(filesListContainer);
    filesInterface.appendChild(uploadSection);
    
    // Create settings interface
    const settingsInterface = document.createElement('div');
    settingsInterface.className = 'ai-settings-interface';
    
    // Create settings container
    const settingsContainer = document.createElement('div');
    settingsContainer.className = 'ai-settings-container';
    
    // Create settings header
    const settingsHeader = document.createElement('div');
    settingsHeader.className = 'ai-settings-header';
    settingsHeader.textContent = 'API Keys Configuration';
    
    // Create settings form
    const settingsForm = document.createElement('form');
    settingsForm.className = 'ai-settings-form';
    
    // Create OpenAI API key input
    const openaiKeyLabel = document.createElement('label');
    openaiKeyLabel.className = 'ai-settings-label';
    openaiKeyLabel.textContent = 'OpenAI API Key:';
    openaiKeyLabel.htmlFor = 'ai-openai-key-input';
    
    const openaiKeyInput = document.createElement('input');
    openaiKeyInput.type = 'text';
    openaiKeyInput.id = 'ai-openai-key-input';
    openaiKeyInput.className = 'ai-settings-input';
    openaiKeyInput.placeholder = 'Enter your OpenAI API key';
    
    // Create Composio API key input
    const composioKeyLabel = document.createElement('label');
    composioKeyLabel.className = 'ai-settings-label';
    composioKeyLabel.textContent = 'Composio API Key:';
    composioKeyLabel.htmlFor = 'ai-composio-key-input';
    
    const composioKeyInput = document.createElement('input');
    composioKeyInput.type = 'text';
    composioKeyInput.id = 'ai-composio-key-input';
    composioKeyInput.className = 'ai-settings-input';
    composioKeyInput.placeholder = 'Enter your Composio API key (optional)';
    
    // Create save button
    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className = 'ai-settings-save-button';
    saveButton.textContent = 'Save';
    
    // Create status message
    const settingsStatus = document.createElement('div');
    settingsStatus.className = 'ai-settings-status';
    
    // Assemble settings form
    settingsForm.appendChild(openaiKeyLabel);
    settingsForm.appendChild(openaiKeyInput);
    settingsForm.appendChild(composioKeyLabel);
    settingsForm.appendChild(composioKeyInput);
    settingsForm.appendChild(saveButton);
    
    // Assemble settings container
    settingsContainer.appendChild(settingsHeader);
    settingsContainer.appendChild(settingsForm);
    settingsContainer.appendChild(settingsStatus);
    
    // Assemble settings interface
    settingsInterface.appendChild(settingsContainer);
    
    // Function to load files list
    const loadFilesList = async () => {
        filesList.innerHTML = '<div class="ai-loading-indicator">Loading files...</div>';
        
        try {
            const data = await fetchWithRetry('http://localhost:8080/list_files', {
                method: 'GET'
            });
            
            if (data.files && Array.isArray(data.files)) {
                filesList.innerHTML = '';
                
                if (data.files.length === 0) {
                    filesList.innerHTML = '<div class="ai-no-files">No files found</div>';
                    return;
                }
                
                data.files.forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'ai-file-item';
                    
                    const fileName = document.createElement('div');
                    fileName.className = 'ai-file-name';
                    fileName.textContent = file.name;
                    
                    const fileSize = document.createElement('div');
                    fileSize.className = 'ai-file-size';
                    fileSize.textContent = formatFileSize(file.size);
                    
                    const fileDate = document.createElement('div');
                    fileDate.className = 'ai-file-date';
                    fileDate.textContent = new Date(file.modified).toLocaleString();
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'ai-file-delete';
                    deleteButton.textContent = '✕';
                    deleteButton.title = 'Delete file';
                    deleteButton.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete ${file.name}?`)) {
                            try {
                                const response = await fetch('http://localhost:8080/delete_file', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        filename: file.name
                                    })
                                });
                                
                                const result = await response.json();
                                
                                if (result.success) {
                                    fileItem.remove();
                                    if (filesList.children.length === 0) {
                                        filesList.innerHTML = '<div class="ai-no-files">No files found</div>';
                                    }
                                } else {
                                    alert(`Error: ${result.error}`);
                                }
                            } catch (error) {
                                console.error('Error deleting file:', error);
                                alert('Failed to delete file');
                            }
                        }
                    });
                    
                    fileItem.appendChild(fileName);
                    fileItem.appendChild(fileSize);
                    fileItem.appendChild(fileDate);
                    fileItem.appendChild(deleteButton);
                    
                    filesList.appendChild(fileItem);
                });
            } else {
                filesList.innerHTML = '<div class="ai-error">Error loading files</div>';
            }
        } catch (error) {
            console.error('Error loading files:', error);
            filesList.innerHTML = '<div class="ai-error">Could not connect to server. Please check if server is running.</div>';
        }
    };
    
    // Function to format file size
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        else return (bytes / 1073741824).toFixed(1) + ' GB';
    };
    
    // Handle file upload
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const files = fileInput.files;
        
        if (files.length === 0) {
            uploadStatus.textContent = 'Please select files to upload';
            uploadStatus.className = 'ai-upload-status error';
            return;
        }
        
        uploadStatus.textContent = 'Uploading...';
        uploadStatus.className = 'ai-upload-status loading';
        uploadButton.disabled = true;
        
        const formData = new FormData();
        
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        
        try {
            const response = await fetch('http://localhost:8080/upload_files', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                uploadStatus.textContent = `Successfully uploaded ${files.length} file(s)`;
                uploadStatus.className = 'ai-upload-status success';
                uploadForm.reset();
                
                // Reload files list
                loadFilesList();
            } else {
                uploadStatus.textContent = `Error: ${result.error}`;
                uploadStatus.className = 'ai-upload-status error';
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            uploadStatus.textContent = 'Failed to connect to server';
            uploadStatus.className = 'ai-upload-status error';
        } finally {
            uploadButton.disabled = false;
        }
    });
    
    // Function to load existing API key status
    const loadApiKeyStatus = async () => {
        settingsStatus.textContent = 'Checking API key status...';
        settingsStatus.className = 'ai-settings-status loading';
        
        try {
            const data = await fetchWithRetry('http://localhost:8080/get_env', {
                method: 'GET'
            });
            
            if (data.success) {
                // Clear inputs first
                openaiKeyInput.value = '';
                composioKeyInput.value = '';
                
                // Update placeholders based on whether keys exist
                if (data.openai_key) {
                    openaiKeyInput.placeholder = '******** (API key already set)';
                } else {
                    openaiKeyInput.placeholder = 'Enter your OpenAI API key';
                }
                
                if (data.composio_key) {
                    composioKeyInput.placeholder = '******** (API key already set)';
                } else {
                    composioKeyInput.placeholder = 'Enter your Composio API key (optional)';
                }
                
                settingsStatus.textContent = 'API key status loaded';
                settingsStatus.className = 'ai-settings-status success';
                
                // Hide status after a moment
                setTimeout(() => {
                    settingsStatus.textContent = '';
                    settingsStatus.className = 'ai-settings-status';
                }, 2000);
            } else {
                settingsStatus.textContent = `Error: ${data.error || 'Failed to load API key status'}`;
                settingsStatus.className = 'ai-settings-status error';
            }
        } catch (error) {
            console.error('Error loading API key status:', error);
            settingsStatus.textContent = 'Could not connect to server. Please check if server is running.';
            settingsStatus.className = 'ai-settings-status error';
        }
    };
    
    // Handle settings form submission
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const openaiKey = openaiKeyInput.value.trim();
        const composioKey = composioKeyInput.value.trim();
        
        // Check if at least one key is provided
        if (!openaiKey && !composioKey) {
            settingsStatus.textContent = 'Please enter at least one API key';
            settingsStatus.className = 'ai-settings-status error';
            return;
        }
        
        settingsStatus.textContent = 'Saving API keys...';
        settingsStatus.className = 'ai-settings-status loading';
        saveButton.disabled = true;
        
        try {
            // First update the environment variables
            const updateResponse = await fetch('http://localhost:8080/update_env', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    openai_key: openaiKey || undefined,
                    composio_key: composioKey || undefined
                })
            });
            
            const updateResult = await updateResponse.json();
            
            if (updateResult.success) {
                // Then force reinitialize the agent
                const reinitResponse = await fetch('http://localhost:8080/reinitialize_agent', {
                    method: 'POST'
                });
                
                const reinitResult = await reinitResponse.json();
                
                if (reinitResult.success) {
                    settingsStatus.textContent = 'API keys saved and agent reinitialized successfully';
                    settingsStatus.className = 'ai-settings-status success';
                    
                    // Clear form inputs
                    settingsForm.reset();
                    
                    // Reload the API key status
                    setTimeout(loadApiKeyStatus, 1000);
                } else {
                    settingsStatus.textContent = `Warning: Keys saved but agent reinitialization failed: ${reinitResult.error || 'Unknown error'}`;
                    settingsStatus.className = 'ai-settings-status warning';
                }
            } else {
                settingsStatus.textContent = `Error: ${updateResult.error || 'Failed to save API keys'}`;
                settingsStatus.className = 'ai-settings-status error';
            }
        } catch (error) {
            console.error('Error saving API keys:', error);
            settingsStatus.textContent = 'Failed to connect to server. Please check if server is running.';
            settingsStatus.className = 'ai-settings-status error';
        } finally {
            saveButton.disabled = false;
        }
    });
    
    // Tab switching functionality
    chatTab.addEventListener('click', () => {
        chatTab.classList.add('active');
        filesTab.classList.remove('active');
        settingsTab.classList.remove('active');
        chatInterface.classList.add('active');
        filesInterface.classList.remove('active');
        settingsInterface.classList.remove('active');
    });
    
    filesTab.addEventListener('click', () => {
        filesTab.classList.add('active');
        chatTab.classList.remove('active');
        settingsTab.classList.remove('active');
        filesInterface.classList.add('active');
        chatInterface.classList.remove('active');
        settingsInterface.classList.remove('active');
        
        // Load files list when tab is activated
        loadFilesList();
    });
    
    settingsTab.addEventListener('click', () => {
        settingsTab.classList.add('active');
        chatTab.classList.remove('active');
        filesTab.classList.remove('active');
        settingsInterface.classList.add('active');
        chatInterface.classList.remove('active');
        filesInterface.classList.remove('active');
        
        // Load API key status when tab is activated
        loadApiKeyStatus();
    });
    
    // Assemble chat body
    chatBody.appendChild(chatInterface);
    chatBody.appendChild(filesInterface);
    chatBody.appendChild(settingsInterface);
    
    chatContainer.appendChild(chatHeader);
    chatContainer.appendChild(chatBody);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .ai-chat-container {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            display: flex;
            flex-direction: column;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            z-index: 2147483647; /* Maximum z-index value */
            font-family: Arial, sans-serif;
            transition: box-shadow 0.3s ease;
        }
        
        .ai-chat-container:hover {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        .ai-chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background: #4285f4;
            color: white;
            border-radius: 10px 10px 0 0;
            font-weight: bold;
            cursor: move; /* Show move cursor on header */
        }
        
        /* Dragging style */
        .ai-chat-container.dragging {
            opacity: 0.9;
            user-select: none;
        }
        
        .ai-tab-container {
            display: flex;
        }
        
        .ai-tab {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.8);
            padding: 0 10px;
            margin-right: 5px;
            cursor: pointer;
            font-weight: bold;
            border-bottom: 2px solid transparent;
        }
        
        .ai-tab.active {
            color: white;
            border-bottom: 2px solid white;
        }
        
        .ai-chat-toggle {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0 5px;
        }
        
        .ai-chat-body {
            display: flex;
            flex-direction: column;
            height: 400px;
            max-height: 60vh;
        }
        
        .ai-chat-interface, .ai-files-interface {
            display: none;
            flex-direction: column;
            height: 100%;
        }
        
        .ai-chat-interface.active, .ai-files-interface.active {
            display: flex;
        }
        
        .ai-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .ai-chat-message {
            padding: 8px 12px;
            border-radius: 18px;
            max-width: 75%;
            word-break: break-word;
        }
        
        .ai-message {
            align-self: flex-start;
            background: #f1f3f4;
            color: #000000;
        }
        
        .user-message {
            align-self: flex-end;
            background: #4285f4;
            color: white;
        }
        
        .error {
            background: #ffebee;
            color: #d32f2f;
        }
        
        .ai-chat-input-container {
            display: flex;
            padding: 10px;
            border-top: 1px solid #e0e0e0;
        }
        
        .ai-chat-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 20px;
            outline: none;
        }
        
        .ai-chat-send {
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 20px;
            padding: 8px 15px;
            margin-left: 8px;
            cursor: pointer;
            font-weight: bold;
        }
        
        .ai-chat-send:hover {
            background: #3367d6;
        }
        
        /* Files interface styles */
        .ai-files-interface {
            display: none;
        }
        
        .ai-files-list-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .ai-files-header {
            padding: 10px 15px;
            font-weight: bold;
            border-bottom: 1px solid #e0e0e0;
            color: #000000;
        }
        
        .ai-files-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        
        .ai-file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .ai-file-item:hover {
            background: #f8f9fa;
        }
        
        .ai-file-name {
            flex: 1;
            font-weight: bold;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #000000;
        }
        
        .ai-file-size {
            margin: 0 10px;
            color: #5f6368;
            font-size: 0.85em;
        }
        
        .ai-file-date {
            color: #5f6368;
            font-size: 0.85em;
            margin-right: 10px;
        }
        
        .ai-file-delete {
            background: none;
            border: none;
            color: #d93025;
            cursor: pointer;
            font-size: 16px;
            padding: 0;
            margin-left: 5px;
        }
        
        .ai-no-files, .ai-loading-indicator, .ai-error {
            padding: 20px;
            text-align: center;
            color: #000000;
        }
        
        .ai-error {
            background: #ffebee !important;
            color: #d32f2f !important;
        }
        
        .ai-upload-section {
            padding: 10px 15px;
            border-top: 1px solid #e0e0e0;
        }
        
        .ai-upload-header {
            font-weight: bold;
            margin-bottom: 10px;
            color: #000000;
        }
        
        .ai-upload-form {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .ai-file-input {
            width: 100%;
            position: absolute;
            left: -9999px; /* Hide the default input but keep it functional */
        }
        
        .ai-file-input-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .ai-file-input-label {
            background: #f1f3f4;
            color: #000000;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            display: inline-block;
            text-align: center;
            font-weight: bold;
        }
        
        .ai-file-input-label:hover {
            background: #e8eaed;
        }
        
        .ai-file-input-text {
            margin-top: 5px;
            color: #000000;
            font-size: 13px;
        }
        
        .ai-upload-button {
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px;
            cursor: pointer;
            font-weight: bold;
        }
        
        .ai-upload-button:hover {
            background: #3367d6;
        }
        
        .ai-upload-button:disabled {
            background: #c5cae9;
            cursor: not-allowed;
        }
        
        .ai-upload-status {
            margin-top: 10px;
            padding: 8px;
            border-radius: 4px;
            text-align: center;
        }
        
        .ai-upload-status.error {
            background: #ffebee;
            color: #d32f2f;
        }
        
        .ai-upload-status.success {
            background: #e8f5e9;
            color: #2e7d32;
        }
        
        .ai-upload-status.loading {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .thinking {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .dot-animation span {
            animation: dots 1.5s infinite;
            animation-fill-mode: both;
            font-size: 20px;
            line-height: 1;
        }
        
        .dot-animation span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .dot-animation span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes dots {
            0% { opacity: 0.2; transform: translateY(0); }
            20% { opacity: 1; transform: translateY(-5px); }
            40% { opacity: 0.2; transform: translateY(0); }
        }
        
        .ai-error {
            background: #ffebee !important;
            color: #d32f2f !important;
            padding: 10px;
            border-radius: 4px;
            font-size: 0.9em;
            line-height: 1.4;
        }
        
        /* Settings interface styles */
        .ai-settings-interface {
            display: none;
            flex-direction: column;
            height: 100%;
            overflow-y: auto;
        }
        
        .ai-settings-interface.active {
            display: flex;
        }
        
        .ai-settings-container {
            padding: 20px;
        }
        
        .ai-settings-header {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e0e0e0;
            color: #000000;
        }
        
        .ai-settings-form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .ai-settings-label {
            font-weight: bold;
            margin-bottom: 5px;
            display: block;
            color: #000000;
        }
        
        .ai-settings-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .ai-settings-save-button {
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 10px;
        }
        
        .ai-settings-save-button:hover {
            background: #3367d6;
        }
        
        .ai-settings-save-button:disabled {
            background: #c5cae9;
            cursor: not-allowed;
        }
        
        .ai-settings-status {
            margin-top: 15px;
            padding: 10px;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .ai-settings-status.error {
            background: #ffebee;
            color: #d32f2f;
        }
        
        .ai-settings-status.success {
            background: #e8f5e9;
            color: #2e7d32;
        }
        
        .ai-settings-status.loading {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .ai-settings-status.warning {
            background: #fff3e0;
            color: #e65100;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(chatContainer);
    
    // Make the window draggable
    let isDragging = false;
    let offsetX, offsetY;
    
    // Function to handle drag start
    const handleDragStart = (e) => {
        // Only start drag if clicking on the header but not on buttons
        if (e.target.classList.contains('ai-tab') || 
            e.target.classList.contains('ai-chat-toggle')) {
            return;
        }
        
        isDragging = true;
        chatContainer.classList.add('dragging');
        
        // Calculate the offset of the mouse relative to the chat container
        const containerRect = chatContainer.getBoundingClientRect();
        offsetX = e.clientX - containerRect.left;
        offsetY = e.clientY - containerRect.top;
        
        // Prevent text selection during drag
        e.preventDefault();
    };
    
    // Function to handle dragging
    const handleDrag = (e) => {
        if (!isDragging) return;
        
        // Calculate new position
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        
        // Check window boundaries
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const containerWidth = chatContainer.offsetWidth;
        const containerHeight = chatContainer.offsetHeight;
        
        // Ensure the container stays within the window boundaries
        newX = Math.max(0, Math.min(newX, windowWidth - containerWidth));
        newY = Math.max(0, Math.min(newY, windowHeight - containerHeight));
        
        // Update position
        chatContainer.style.left = `${newX}px`;
        chatContainer.style.top = `${newY}px`;
        
        // Remove the default right position when dragged
        chatContainer.style.right = 'auto';
    };
    
    // Function to handle drag end
    const handleDragEnd = () => {
        if (isDragging) {
            isDragging = false;
            chatContainer.classList.remove('dragging');
        }
    };
    
    // Add event listeners for dragging
    chatHeader.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    
    // Remove event listeners when extension is unloaded
    window.addEventListener('unload', () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
    });
    
    return chatContainer;
}

// Function to initialize the extension
function initializeExtension() {
    console.log('Initializing extension...');
    
    // Create chat window
    createChatWindow();
}

// Ensure DOM is fully loaded
function waitForDOM() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeExtension);
    } else {
        initializeExtension();
    }
}

// Start the process
waitForDOM();

// Function to handle API requests with retry and better error handling
async function fetchWithRetry(url, options, retries = 2) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        if (retries > 0) {
            // Wait for a short delay before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`Retrying request to ${url}, ${retries} attempts left`);
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
} 