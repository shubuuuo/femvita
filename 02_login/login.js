// script.js

// Select the form and add an event listener
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.login-form');

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        // Get form data
        const name = document.getElementById('name').value;
        const gender = document.querySelector('input[name="gender"]:checked').value;
        const age = document.getElementById('age').value;

        if (name && gender && age) {
            // Create an object to store user data
            const userData = {
                name,
                gender,
                age
            };

            // Save to local storage (or session storage if needed)
            localStorage.setItem('userData', JSON.stringify(userData));

            alert('Data saved successfully!');

            // Optional: Display data in the console
            console.log('Saved Data:', userData);

            window.location.href = '../01_welcome/welcome.html';
        } else {
            alert('Please fill out all fields.');
        }
    });
});
