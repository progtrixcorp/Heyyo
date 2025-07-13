function deleteAccount() {
    if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
        fetch('/delete-account', {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Account successfully deleted') {
                alert("Account successfully deleted");
                window.location.href = "index.html";
            } else {
                throw new Error(data.message || 'Failed to delete account');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            if (error.message === 'Not authenticated') {
                alert("Please log in first");
                window.location.href = "index.html";
            } else {
                alert("Failed to delete account: " + error.message);
            }
        });
    }
}