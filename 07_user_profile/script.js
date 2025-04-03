// Toggle Sidebar Function
function toggleSidebar() {
  const sidebar = document.getElementById("mySidebar");
  if (sidebar.style.width === "250px") {
    sidebar.style.width = "0";
  } else {
    sidebar.style.width = "250px";
  }
}

// Remove data after clicking Logout
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("userData");
  localStorage.removeItem("bmiData");
  localStorage.removeItem("goalData");
  localStorage.removeItem("dietData");
  localStorage.removeItem("mentalData");
  alert("You have logged out!");
});

// Load data from localStorage
const userData = JSON.parse(localStorage.getItem("userData")) || {};
const bmiData = JSON.parse(localStorage.getItem("bmiData")) || {};
const goalData = JSON.parse(localStorage.getItem("goalData")) || {};
const dietData = JSON.parse(localStorage.getItem("dietData")) || {};
const mentalData = JSON.parse(localStorage.getItem("mentalData")) || {};

// Fill user profile fields
document.getElementById("userName").textContent = userData.name || "N/A";
document.getElementById("userAge").textContent = userData.age || "N/A";
document.getElementById("userGender").textContent = userData.gender || "N/A";
document.getElementById("userBMI").textContent = bmiData.bmi || "N/A";
document.getElementById("userGoal").textContent = goalData.goal || "N/A";
document.getElementById("userDiet").textContent = dietData.diet || "N/A";

// Display mental health data
const mentalStatus = mentalData.sleep
  ? `Sleep: ${mentalData.sleep} hrs, Stress: ${mentalData.stress}, Mood: ${mentalData.mood}, Anxiety: ${mentalData.anxiety}`
  : "No mental health data available.";
document.getElementById("mentalData").textContent = mentalStatus;
