document.addEventListener("DOMContentLoaded", () => {
  const safetyTips = [
    "Always share your location with a trusted contact.",
    "Avoid walking alone at night in isolated areas.",
    "Keep emergency contacts easily accessible.",
    "Trust your instincts and avoid uncomfortable situations.",
    "Carry self-defense items like pepper spray.",
  ];

  const safetyList = document.getElementById("safety-tips");

  safetyTips.forEach((tip) => {
    const li = document.createElement("li");
    li.textContent = tip;
    safetyList.appendChild(li);
  });
});

function toggleSidebar() {
  const sidebar = document.getElementById("mySidebar");
  if (sidebar.style.width === "250px") {
    sidebar.style.width = "0";
  } else {
    sidebar.style.width = "250px";
  }
}

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("userData");
  localStorage.removeItem("bmiData");
  localStorage.removeItem("goalData");
  localStorage.removeItem("dietData");
  localStorage.removeItem("mentalData");
  alert("You have logged out!");
});

document.getElementById('click-btn-1').addEventListener('click', () => {
  window.location.href = 'https://indianhelpline.com/important-numbers';
});
document.getElementById('click-btn-2').addEventListener('click', () => {
  window.location.href = 'https://wcdhry.gov.in/women-helpline-number-181/';
});
document.getElementById('click-btn-3').addEventListener('click', () => {
  window.location.href = 'https://wcdhry.gov.in/protection-against-domestic-violence/';
});