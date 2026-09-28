import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function StudentCalendarPage() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    api.get(`/calendar?month=${monthStr}`)
      .then((res) => setEvents(res.data.events))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [monthStr]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const getEventsForDay = (day) => {
    return events.filter((e) => {
      const d = new Date(e.start_date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const typeColors = {
    lesson: '#3B82F6',
    quiz: '#F59E0B',
    exam: '#EF4444',
    activity: '#10B981',
    deadline: '#EF4444',
    other: '#6B7280',
  };

  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
        <button onClick={prevMonth} className="text-slate-600 hover:text-slate-900 px-3 py-1 rounded-lg hover:bg-slate-100">
          ← Prev
        </button>
        <h2 className="text-lg font-bold text-slate-800">{monthName}</h2>
        <button onClick={nextMonth} className="text-slate-600 hover:text-slate-900 px-3 py-1 rounded-lg hover:bg-slate-100">
          Next →
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
            <span className="text-slate-600 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="px-2 py-3 text-center text-xs font-medium text-slate-500 bg-slate-50">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div key={idx} className={`min-h-[80px] border-b border-r border-slate-100 p-1.5
                ${!day ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                {day && (
                  <>
                    <span className={`text-xs font-medium inline-block w-6 h-6 text-center leading-6 rounded-full
                      ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div key={e.id} className="text-[10px] px-1.5 py-0.5 rounded truncate text-white font-medium"
                          style={{ backgroundColor: e.color || typeColors[e.event_type] || '#6B7280' }}
                          title={e.title}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events list */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Upcoming Events</h3>
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : events.length === 0 ? (
          <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">
            No events this month.
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-3 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: e.color || typeColors[e.event_type] || '#6B7280' }}></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800 truncate">{e.title}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(e.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' · '}{e.course?.name}
                    {' · '}<span className="capitalize">{e.event_type}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
