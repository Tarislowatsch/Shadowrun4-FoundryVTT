/**
 * @returns {void}
 */
export function rangeHelper() {
  /**
   * @param {number} start - The first integer in the range (inclusive).
   * @param {number} end - The upper bound of the range (exclusive).
   * @returns {number[]} An array of integers from `start` up to (but not including) `end`.
   */
  Handlebars.registerHelper('range', function (start, end) {
    const range = [];
    for (let i = start; i < end; i++) {
      range.push(i);
    }
    return range;
  });
}
