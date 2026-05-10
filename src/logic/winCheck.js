// Battle Line 公式の勝利判定: 5 旗獲得 OR 3 連続旗獲得。

export function checkWinCondition(flags) {
    let p1Wins = 0;
    let p2Wins = 0;
    let p1Consecutive = 0;
    let p2Consecutive = 0;
    let maxP1Consecutive = 0;
    let maxP2Consecutive = 0;

    for (let i = 0; i < flags.length; i++) {
        if (flags[i].claimedBy === 'P1') {
            p1Wins++;
            p1Consecutive++;
            p2Consecutive = 0;
            if (p1Consecutive > maxP1Consecutive) maxP1Consecutive = p1Consecutive;
        } else if (flags[i].claimedBy === 'P2') {
            p2Wins++;
            p2Consecutive++;
            p1Consecutive = 0;
            if (p2Consecutive > maxP2Consecutive) maxP2Consecutive = p2Consecutive;
        } else {
            p1Consecutive = 0;
            p2Consecutive = 0;
        }
    }

    if (p1Wins >= 5 || maxP1Consecutive >= 3) return 'P1';
    if (p2Wins >= 5 || maxP2Consecutive >= 3) return 'P2';
    return null;
}
