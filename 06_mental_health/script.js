function generateChart() {
    const stress = parseInt(document.getElementById('stress').value);
    const sleep = parseInt(document.getElementById('sleep').value);
    const mood = parseInt(document.getElementById('mood').value);
    const anxiety = parseInt(document.getElementById('anxiety').value);
    const suggestions = document.getElementById('suggestions');

    // Validate input
    if (
        isNaN(stress) || isNaN(sleep) || isNaN(mood) || isNaN(anxiety) ||
        stress < 1 || stress > 10 || sleep < 0 || sleep > 12 ||
        mood < 1 || mood > 10 || anxiety < 1 || anxiety > 10
    ) {
        suggestions.innerHTML = 'Please enter valid details!';
        suggestions.style.color = 'red';
        return;
    }

    // Create chart data
    const data = {
        labels: ['Stress', 'Sleep', 'Mood', 'Anxiety'],
        datasets: [{
            label: 'Mental Health Status',
            data: [stress, sleep, mood, anxiety],
            backgroundColor: [
                'rgba(255, 99, 132, 0.5)', // Stress - Red
                'rgba(54, 162, 235, 0.5)', // Sleep - Blue
                'rgba(75, 192, 192, 0.5)', // Mood - Green
                'rgba(255, 206, 86, 0.5)'  // Anxiety - Yellow
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(255, 206, 86, 1)'
            ],
            borderWidth: 1
        }]
    };

    // Destroy previous chart instance if exists
    if (window.myChart instanceof Chart) {
        window.myChart.destroy();
    }

    // Create chart
    const ctx = document.getElementById('mentalHealthChart').getContext('2d');
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10
                }
            }
        }
    });

    // Generate suggestions based on the data
    let message = `<strong>Suggestions:</strong><br>`;

    if (stress > 7) {
        message += '- Try relaxation techniques (e.g., deep breathing, meditation).<br>';
        nextBtn.disabled = false;
    }
    if (sleep < 6) {
        message += '- Aim for 7–9 hours of sleep daily.<br>';
        nextBtn.disabled = false;
    }
    if (mood < 4) {
        message += '- Engage in mood-boosting activities (exercise, social interaction).<br>';
        nextBtn.disabled = false;
    }
    if (anxiety > 7) {
        message += '- Consider speaking with a mental health professional.<br>';
        nextBtn.disabled = false;
    }

    if (message === `<strong>Suggestions:</strong><br>`) {
        message += 'Everything looks balanced!';
    }

    suggestions.innerHTML = message;
    suggestions.style.color = '#333';

        // Save mental data to localStorage
        const mentalData = {
            sleep: sleep,
            stress: stress,
            mood: mood,
            anxiety: anxiety
        };
        localStorage.setItem('mentalData', JSON.stringify(mentalData));
        console.log('Saved Data:', mentalData);

}
function getUserProfile() {
    window.location.href = "../07_user_profile/user_profile.html"; 
}