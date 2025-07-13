document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("feedbackForm");
    const successMessage = document.getElementById("successMessage");

    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            const formData = new FormData(form);
            const name = formData.get('name');
            const email = formData.get('email');
            const feedback = formData.get('message');
            try {
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, feedback })
                });
                if (response.ok) {
                    form.style.display = "none";
                    if (successMessage) {
                        successMessage.style.display = "block";
                    }
                } else {
                    const data = await response.json();
                    alert(data.error || 'Failed to send feedback.');
                }
            } catch (err) {
                alert('Error sending feedback.');
            }
        });
    }
});