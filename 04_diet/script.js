document.addEventListener('DOMContentLoaded', () => {
    const dietPlan = document.getElementById('diet-plan');
    const generateBtn = document.getElementById('generate-btn');
    const goal = document.getElementById('goal');
    const nextBtn = document.getElementById("nextBtn");

    // Retrieve user data from localStorage
    const bmiData = JSON.parse(localStorage.getItem('bmiData'));
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (bmiData && userData) {
        document.getElementById('text').textContent = 
            `We have noted that you are ${userData.age} years old with a BMI of ${bmiData.bmi.toFixed(2)}. 
            Please select your goal from the options below and click on "Generate Plan" to receive a tailored plan designed specifically for you.`;

        generateBtn.addEventListener('click', () => {
            let plan = '';

            if (userData.age < 18) {
                plan += `<strong>For Teens (Below 18):</strong><br>`;
            } else if (userData.age >= 18 && userData.age <= 60) {
                plan += `<strong>For Adults (18 to 60):</strong><br>`;
            } else {
                plan += `<strong>For Seniors (Above 60):</strong><br>`;
            }

            // Adjust plan based on BMI
            if (bmiData.bmi < 18.5) {
                plan += '- Focus on nutrient-rich, calorie-dense foods.<br>';
                plan += '- Include healthy fats, lean proteins, and whole grains.<br>';
            } else if (bmiData.bmi >= 18.5 && bmiData.bmi < 24.9) {
                plan += '- Maintain a balanced diet with fruits, vegetables, and proteins.<br>';
                plan += '- Ensure regular exercise and hydration.<br>';
            } else {
                plan += '- Reduce sugar and processed foods.<br>';
                plan += '- Increase fiber intake and focus on whole foods.<br>';
            }

            // Adjust based on the selected goal
            switch (goal.value) {
                case 'weightLoss':
                    plan += `<br><strong>Goal: Weight Loss</strong><br>`;
                    plan += '- Cut down on high-calorie, low-nutrient foods.<br>';
                    plan += '- Focus on high-fiber and protein-rich meals.<br>';
                    plan += '- Incorporate cardio and strength exercises.<br>';
                    nextBtn.disabled = false;
                    break;
                case 'muscleGain':
                    plan += `<br><strong>Goal: Muscle Gain</strong><br>`;
                    plan += '- Increase protein intake.<br>';
                    plan += '- Include strength training in your workout routine.<br>';
                    plan += '- Add complex carbs like sweet potatoes and whole grains.<br>';
                    nextBtn.disabled = false;
                    break;
                case 'maintenance':
                    plan += `<br><strong>Goal: Maintenance</strong><br>`;
                    plan += '- Maintain balanced macronutrient intake.<br>';
                    plan += '- Keep up with regular physical activity.<br>';
                    plan += '- Stay hydrated and ensure adequate sleep.<br>';
                    nextBtn.disabled = false;
                    break;
                default:
                    plan += '<br><em>Please select a goal to get a more accurate plan.</em><br>';
                    nextBtn.disabled = true;
            }

            // Display the generated plan
            dietPlan.innerHTML = plan;
            dietPlan.style.color = '#333';

            // Save goal data to localStorage
            if (goal.value) {
                const goalData = {
                    goal: goal.value 
                };
                localStorage.setItem('goalData', JSON.stringify(goalData));
                console.log('Saved Data:', goalData);
            }
        });
    }
});

function getWorkoutPlan() {
    window.location.href = "../05_workout/workout.html"; 
}
