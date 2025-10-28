document.addEventListener('DOMContentLoaded', () => {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
  if (!loggedInUser || loggedInUser.role !== 'teacher') {
    alert('Access denied. Please log in as a teacher.');
    window.location.href = 'login.html';
    return;
  }

  const teacherName = loggedInUser.name;
  document.getElementById('userName').textContent = teacherName;

  const assignedClassDiv = document.getElementById('assignedClass');
  const teacherClasses = JSON.parse(localStorage.getItem('teacherClasses')) || [];
  const assigned = teacherClasses.find(tc => tc.teacherEmail === loggedInUser.email);
  assignedClassDiv.innerHTML = assigned
    ? `<p>📚 <b>${assigned.className}</b> at <b>${assigned.time}</b></p>`
    : `<p>No class assigned yet.</p>`;

  let labVisits = JSON.parse(localStorage.getItem('labVisits')) || [];
  const today = new Date();

  const current = labVisits.filter(v => v.teacher_name === teacherName && v.visit_date === today.toISOString().split('T')[0]);
  const next = labVisits.filter(v => v.teacher_name === teacherName && v.visit_date > today.toISOString().split('T')[0]);

  populateTable('currentLessons', current);
  populateTable('nextLesson', next);

  const form = document.getElementById('teacherInputForm');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.teacher_name = teacherName;
    data.teacher_email = loggedInUser.email;
    data.visit_date = today.toISOString().split('T')[0];
    data.lesson_number = labVisits.filter(v => v.teacher_name === teacherName).length + 1;

    // Save
    labVisits.push(data);
    localStorage.setItem('labVisits', JSON.stringify(labVisits));

    let teacherInput = JSON.parse(localStorage.getItem('teacherInput')) || [];
    teacherInput.push(data);
    localStorage.setItem('teacherInput', JSON.stringify(teacherInput));

    next.push(data);
    populateTable('nextLesson', next);
    form.reset();
    alert('Lab info submitted! Admin will be notified.');
  });

  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
  });

  function populateTable(tableId, data) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:gray;">No lessons scheduled</td></tr>`;
      return;
    }
    data.forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${v.visit_date}</td><td>${v.class_name}</td><td>${v.project_name}</td><td>${v.lesson_number}</td>`;
      tbody.appendChild(tr);
    });
  }
});
