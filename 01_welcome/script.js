// script.js

// Load user data from localStorage
document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (userData) {
        document.getElementById('welcome-text').textContent = `Welcometo FemVita, ${userData.name}!`;
        document.getElementById('user-info').textContent = 
            `Empowering women to take charge of their mental and physical health. Here, you as a ${userData.age} year old will find personalized diet plans, workout routines, and mental health resources tailored just for you.`;
        document.getElementById('additional-user-info').textContent = 
            `Explore helpful articles, track your progress, and connect with a supportive community.
            Your journey to better health starts here — let's make it amazing together!`;
    } else {
        window.location.href = '../02_login/login.html'; 
    }

    // Logout Button Functionality
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('userData');
        alert('You have logged out!');
        window.location.href = '../02_login/login.html';
    });
    document.getElementById('next').addEventListener('click', () => {
        alert('Going to calculate your BMI!');
        window.location.href = '../03_bmi/bmi.html';
    });
});
