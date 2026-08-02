// Default weekly availability, shared by the doctor's Availability page and
// the user-facing slot generator so both agree on what "open" means.
const DEFAULT_AVAILABILITY = {
  monday:    { enabled: true,  slots: [{ start: '09:00', end: '17:00' }] },
  tuesday:   { enabled: true,  slots: [{ start: '09:00', end: '17:00' }] },
  wednesday: { enabled: true,  slots: [{ start: '09:00', end: '17:00' }] },
  thursday:  { enabled: true,  slots: [{ start: '09:00', end: '17:00' }] },
  friday:    { enabled: true,  slots: [{ start: '09:00', end: '17:00' }] },
  saturday:  { enabled: false, slots: [] },
  sunday:    { enabled: false, slots: [] },
};

module.exports = { DEFAULT_AVAILABILITY };
