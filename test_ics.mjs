import ical from 'ical';
import fs from 'fs';

const content = fs.readFileSync('/home/ubuntu/upload/pasted_file_N8TBtS_课程日历1.ics', 'utf-8');
const events = ical.parseICS(content);

let veventCount = 0;
let firstVEvent = null;

for (const key in events) {
  if (events[key].type === 'VEVENT') {
    veventCount++;
    if (firstVEvent === null) {
      firstVEvent = events[key];
    }
  }
}

console.log('VEVENT事件数量:', veventCount);

if (firstVEvent) {
  console.log('\n第一个VEVENT:');
  console.log('Summary:', firstVEvent.summary);
  console.log('Start:', firstVEvent.start);
  console.log('End:', firstVEvent.end);
  console.log('Organizer:', JSON.stringify(firstVEvent.organizer, null, 2));
  console.log('Location:', firstVEvent.location);
  console.log('Description:', firstVEvent.description);
}
