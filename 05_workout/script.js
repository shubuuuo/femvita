function generateWorkoutPlan() {
    const age = parseInt(document.getElementById('age').value);
    const bmi = parseFloat(document.getElementById('bmi').value);
    const diet = document.getElementById('diet').value;
    const workoutPlan = document.getElementById('workout-plan');

    // Validate input
    if (!age || !bmi || !diet || age <= 0 || bmi <= 0) {
        workoutPlan.innerHTML = 'Please enter valid details!';
        workoutPlan.style.color = 'red';
        return;
    }

    let plan = '';

    // Generate plan based on age, BMI, and diet
    if (age < 18) {
        plan += `<strong>For Teens (Below 18):</strong><br>`;
        if (bmi < 18.5) {
            plan += '- Focus on bodyweight exercises (push-ups, squats).<br>';
            plan += '- Include flexibility and mobility training.<br>';
            plan += '- Engage in team sports or swimming.<br>';
        } else if (bmi >= 18.5 && bmi < 24.9) {
            plan += '- Focus on strength training and cardio.<br>';
            plan += '- Include stretching and flexibility exercises.<br>';
        } else {
            plan += '- Increase cardio sessions.<br>';
            plan += '- Focus on high-intensity interval training (HIIT).<br>';
        }
    } else if (age >= 18 && age <= 60) {
        plan += `<strong>For Adults (18 to 60):</strong><br>`;
        if (bmi < 18.5) {
            plan += '- Strength training (3–4 days/week).<br>';
            plan += '- Include moderate cardio.<br>';
        } else if (bmi >= 18.5 && bmi < 24.9) {
            plan += '- Balanced workout of strength, cardio, and flexibility.<br>';
            plan += '- Yoga and Pilates for core strength.<br>';
        } else {
            plan += '- Focus on fat-burning workouts (HIIT, running).<br>';
            plan += '- Include strength training 2–3 times/week.<br>';
        }
    } else {
        plan += `<strong>For Seniors (Above 60):</strong><br>`;
        if (bmi < 18.5) {
            plan += '- Light strength training.<br>';
            plan += '- Focus on balance and mobility.<br>';
        } else if (bmi >= 18.5 && bmi < 24.9) {
            plan += '- Light strength training and walking.<br>';
            plan += '- Include flexibility exercises.<br>';
        } else {
            plan += '- Low-impact cardio (swimming, walking).<br>';
            plan += '- Light resistance training.<br>';
        }
    }

    // Modify based on diet type
    if (diet === 'high protein') {
        plan += '<br><strong>Diet Tip:</strong> Include more lean protein and vegetables.<br>';
        nextBtn.disabled = false;
    } else if (diet === 'balanced') {
        plan += '<br><strong>Diet Tip:</strong> Maintain a balance of carbs, protein, and fats.<br>';
        nextBtn.disabled = false;
    } else if (diet === 'low carb') {
        plan += '<br><strong>Diet Tip:</strong> Focus on healthy fats and proteins.<br>';
        nextBtn.disabled = false;
    } else {
        plan += '<br><em>Please select a goal to get a more accurate plan.</em><br>';
        nextBtn.disabled = true;
    }

    // Display the plan
    workoutPlan.innerHTML = plan;
    workoutPlan.style.color = '#333';

    // Save diet data to localStorage
    if (diet) {
        const dietData = {
            diet: diet 
        };
        localStorage.setItem('dietData', JSON.stringify(dietData));
        console.log('Saved Data:', dietData);
    }
}
function getMentalHealthChart() {
    window.location.href = "../06_mental_heath/mental_health.html"; 
}