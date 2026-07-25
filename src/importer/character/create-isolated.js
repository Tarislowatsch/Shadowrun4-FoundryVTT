/**
 * Runs `create` for each entry in `dataList` independently, so one rejected
 * creation doesn't prevent the others from succeeding.
 *
 * @param {object[]} dataList
 * @param {(data: object) => Promise<unknown>} create
 * @returns {Promise<{failures: Array<{data: object, error: unknown}>}>}
 */
export async function createIsolated(dataList, create) {
  const results = await Promise.allSettled(
    dataList.map((data) => create(data))
  );
  const failures = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      failures.push({ data: dataList[i], error: result.reason });
    }
  });
  return { failures };
}
