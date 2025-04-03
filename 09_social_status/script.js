document.addEventListener("DOMContentLoaded", () => {
    const issues = [
        "Unequal pay and gender wage gap.",
        "Underrepresentation in leadership roles.",
        "Limited access to education and healthcare.",
        "Gender-based violence and harassment.",
        "Societal pressure and bias."
    ];

    const issuesList = document.getElementById("issues-list");
    
    issues.forEach(issue => {
        const li = document.createElement("li");
        li.textContent = issue;
        issuesList.appendChild(li);
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
  