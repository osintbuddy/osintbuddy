const MAX_TEXT_LENGTH = 100

// TODO: fix me
const createFuzzySearch = function (key, ratio = 0.5) {
  // OLD FUZZY, TODO: abstract me into a search class for multiple search settings...
  // Returns a method that you can use to create your own reusable fuzzy search.
  // return function (query) {
  //   var words = query.toLowerCase().split(' ')

  //   return items.filter(function (item) {
  //     var normalizedTerm = item[key].toLowerCase()

  //     return words.every(function (word) {
  //       return normalizedTerm.indexOf(word) > -1
  //     })
  //   })
  // }
  // ---
  return function (query, item) {
    // Ensure the item has the key and it's a string
    if (!item || typeof item[key] !== 'string') {
      return false // Or handle non-string/missing keys as needed
    }

    const queryLower = query.toLowerCase().trim()
    const itemValueLower = item[key].toLowerCase()

    // Exact match or partial match shortcut
    if (itemValueLower.includes(queryLower)) {
      return true
    }

    // Handle empty query
    if (queryLower === '') {
      return true // Or decide if empty query matches everything/ nothing
    }

    // Fuzzy matching logic based on character occurrences
    let matches = 0
    const queryChars = queryLower.split('')

    for (let i = 0; i < queryChars.length; i++) {
      const char = queryChars[i]
      // Check if the character from the query exists in the item value
      if (itemValueLower.includes(char)) {
        matches += 1
      } else {
        // Optional: Penalize for missing characters
        // matches -= 1;
        // The original logic decremented, but this can lead to negative scores
        // which might not align well with the ratio check.
        // Sticking closer to the original, but consider if penalty is needed.
      }
    }

    // Calculate the match ratio based on query length
    // Handle potential division by zero if query somehow became empty after trim
    const matchRatio = queryLower.length > 0 ? matches / queryLower.length : 0

    // Return true if the calculated ratio meets or exceeds the required ratio
    return matchRatio >= ratio
  }
  // return function (query) {
  //   var string = query.toLowerCase().split(' ')
  //   var compare = term[key].toLowerCase()
  //   var matches = 0
  //   if (string.indexOf(compare) > -1) return true // covers basic partial matches
  //   for (var i = 0; i < compare.length; i++) {
  //     string.indexOf(compare[i]) > -1 ? (matches += 1) : (matches -= 1)
  //   }
  //   return matches / query.length >= ratio || term[key] == ''
  //   //

  //   var words = query.toLowerCase().split(' ')

  //   return items.filter(function (item) {
  //     var normalizedTerm = item[key].toLowerCase()

  //     return words.every(function (word) {
  //       return normalizedTerm.indexOf(word) > -1
  //     })
  //   })
  // }
}
