import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function InstructorStudentsPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [progress, setProgress] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses')
      .then((res) => {
        setCourses(res.data.courses);
        if (res.data.courses.length > 0) setSelectedCourse(res.data.courses[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    Promise.all([
      api.get(`/courses/${selectedCourse}/progress`),
      api.get(`/courses/${selectedCourse}/students`),
    ])
      .then(([p, s]) => { setProgress(p.data.progress); setStudents(s.data.students); })
      .catch(console.error);
  }, [selectedCourse]);

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'240px' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const studentProgress = {};
  students.forEach((s) => { studentProgress[s.id] = { ...s, lessons:[], doneCount:0, totalTime:0 }; });
  progress.forEach((p) => {
    if (studentProgress[p.user_id]) {
      studentProgress[p.user_id].lessons.push(p);
      if (p.status === 'done') studentProgress[p.user_id].doneCount++;
      studentProgress[p.user_id].totalTime += p.time_spent_seconds || 0;
    }
  });

  const statusBg = { pending:'#f1f5f9', in_progress:'#fef9c3', done:'#dcfce7', missing:'#fee2e2' };
  const statusColor = { pending:'#64748b', in_progress:'#a16207', done:'#15803d', missing:'#dc2626' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
      {/* Course selector */}
      <div className="instr-panel" style={{ padding:'18px 22px', display:'flex', alignItems:'center', gap:'14px' }}>
        <label style={{ fontFamily:'Inter,sans-serif', fontWeight:600, fontSize:'14px', color:'var(--instr-ink)', flexShrink:0 }}>Course:</label>
        <select value={selectedCourse || ''} onChange={e => setSelectedCourse(parseInt(e.target.value))} className="instr-form-input" style={{ maxWidth:'420px' }}>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
      </div>

      {/* Student progress table */}
      <div className="instr-students-panel">
        <table className="instr-students-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Lessons Done</th>
              <th>Time Spent</th>
              <th>Lesson Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(studentProgress).map((sp) => (
              <tr key={sp.id}>
                <td>
                  <p className="instr-student-name">{sp.first_name} {sp.last_name}</p>
                  <p style={{ fontSize:'12px', color:'var(--instr-muted)', margin:'2px 0 0' }}>{sp.email}</p>
                </td>
                <td>{sp.doneCount} completed</td>
                <td>{Math.floor(sp.totalTime / 60)} min</td>
                <td>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                    {sp.lessons.length === 0
                      ? <span style={{ fontSize:'12px', color:'var(--instr-muted)' }}>No activity</span>
                      : sp.lessons.map(l => (
                        <span key={l.id} style={{ fontSize:'12px', fontWeight:600, padding:'3px 10px', borderRadius:'999px', background:statusBg[l.status]||'#f1f5f9', color:statusColor[l.status]||'#64748b', fontFamily:'Inter,sans-serif' }} title={l.lesson?.title}>
                          L{(l.lesson?.order||0)+1}: {l.status}
                        </span>
                      ))
                    }
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--instr-muted)', padding:'40px', fontFamily:'Inter,sans-serif' }}>No students enrolled in this course.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
