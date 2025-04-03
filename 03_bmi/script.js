function calculateBMI() {
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const result = document.getElementById('result');

    // Check for valid input
    if (!height || !weight || height <= 0 || weight <= 0) {
        result.innerHTML = 'Please enter valid height and weight!';
        result.style.color = 'red';
        document.getElementById("nextBtn").disabled = true;
        return;
    }

    // BMI Calculation Formula
    const bmi = weight / ((height / 100) * (height / 100));
    let category = '';

    if (bmi < 18.5) {
        category = 'Underweight';
    } else if (bmi >= 18.5 && bmi < 24.9) {
        category = 'Normal weight';
    } else if (bmi >= 25 && bmi < 29.9) {
        category = 'Overweight';
    } else {
        category = 'Obese';
    }
    
    // Show result 
    result.innerHTML = `Your BMI is <strong>${bmi.toFixed(2)}</strong> (${category})`;
    result.style.color = '#ec14f3';

    // Enable the Next button after calculation
    document.getElementById("nextBtn").disabled = false;

    // Save data
    if (bmi) {
            const bmiData = {
                bmi
            };

            localStorage.setItem('bmiData', JSON.stringify(bmiData));

            console.log('Saved Data:', bmiData);
        
    }
}

function goToDietPage() {
    window.location.href = "../04_diet/diet.html"; 
}
