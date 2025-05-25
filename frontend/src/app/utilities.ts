
export function formatTime(date: Date) {
  var hours = date.getHours();
  var minutes: string | number = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}

export function formatPGDate(date: string, showAt: boolean = false): string {
  if (date) {
    const dateStr = date.replace(' ', 'T')
    return `${new Date(dateStr).toDateString()}${showAt ? ' at ' : ' '}${formatTime(new Date(dateStr))}`
  }
  return ''
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const isString = (value: any): boolean => typeof value === 'string';


