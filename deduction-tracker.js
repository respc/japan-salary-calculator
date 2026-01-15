/**
 * Deduction Tracker - 控除額追跡システム
 * Tracks and visualizes deduction usage and remaining limits
 */

class DeductionTracker {
    constructor(deductionLimits) {
        this.deductionLimits = deductionLimits;
        this.trackableDeductions = [
            'aoiroDeduction',
            'shoukiboKyousai',
            'keieiSafety',
            'ideco',
            'lifeInsurance',
            'earthquakeInsurance',
            'furusato'
        ];
    }

    /**
     * Display deduction usage status
     */
    displayDeductionStatus(deductions, formData) {
        const container = document.getElementById('deductionTrackerContainer');
        if (!container) return;

        container.innerHTML = '';

        // Track each deduction
        this.trackableDeductions.forEach(deductionKey => {
            const deductionInfo = this.getDeductionInfo(deductionKey, deductions, formData);
            if (deductionInfo) {
                const statusCard = this.createStatusCard(deductionInfo);
                container.appendChild(statusCard);
            }
        });
    }

    getDeductionInfo(key, deductions, formData) {
        let info = null;

        switch (key) {
            case 'aoiroDeduction':
                const aoiroData = this.deductionLimits['青色申告特別控除'];
                let maxAoiro = 0;
                let recommendedLabel = '';

                if (formData.filingType === 'aoiro') {
                    maxAoiro = 650000;
                    recommendedLabel = '65万円（e-Tax申告推奨）';
                } else {
                    maxAoiro = 0;
                    recommendedLabel = '青色申告への切り替えを推奨';
                }

                info = {
                    name: '青色申告特別控除',
                    used: deductions.aoiroDeduction,
                    limit: maxAoiro,
                    remaining: maxAoiro - deductions.aoiroDeduction,
                    unit: '円',
                    status: deductions.aoiroDeduction >= maxAoiro ? 'excellent' : 'warning',
                    recommendation: deductions.aoiroDeduction < maxAoiro ? recommendedLabel : '最大限活用中！'
                };
                break;

            case 'shoukiboKyousai':
                const shoukiboData = this.deductionLimits['小規模企業共済'];
                info = {
                    name: '小規模企業共済',
                    used: deductions.shoukiboKyousai,
                    limit: shoukiboData.yearlyMax,
                    remaining: shoukiboData.yearlyMax - deductions.shoukiboKyousai,
                    unit: '円',
                    status: this.getUsageStatus(deductions.shoukiboKyousai, shoukiboData.yearlyMax),
                    recommendation: deductions.shoukiboKyousai < shoukiboData.yearlyMax ?
                        `まだ${this.formatShortCurrency(shoukiboData.yearlyMax - deductions.shoukiboKyousai)}の枠があります` :
                        '最大限活用中！'
                };
                break;

            case 'keieiSafety':
                const keieiData = this.deductionLimits['経営セーフティ共済'];
                info = {
                    name: '経営セーフティ共済',
                    used: deductions.keieiSafety,
                    limit: keieiData.yearlyMax,
                    remaining: keieiData.yearlyMax - deductions.keieiSafety,
                    unit: '円',
                    status: this.getUsageStatus(deductions.keieiSafety, keieiData.yearlyMax),
                    recommendation: deductions.keieiSafety === 0 ?
                        '🚨 未利用！大きな節税チャンス！' :
                        deductions.keieiSafety < keieiData.yearlyMax ?
                            `まだ${this.formatShortCurrency(keieiData.yearlyMax - deductions.keieiSafety)}の枠があります` :
                            '最大限活用中！',
                    highlight: deductions.keieiSafety === 0
                };
                break;

            case 'ideco':
                const idecoData = this.deductionLimits['iDeCo'];
                const idecoLimit = idecoData.categories.jigyounushi.yearlyMax;
                info = {
                    name: 'iDeCo（個人型確定拠出年金）',
                    used: deductions.ideco,
                    limit: idecoLimit,
                    remaining: idecoLimit - deductions.ideco,
                    unit: '円',
                    status: this.getUsageStatus(deductions.ideco, idecoLimit),
                    recommendation: deductions.ideco < idecoLimit ?
                        `まだ${this.formatShortCurrency(idecoLimit - deductions.ideco)}の枠があります` :
                        '最大限活用中！'
                };
                break;

            case 'lifeInsurance':
                const lifeData = this.deductionLimits['生命保険料控除'];
                info = {
                    name: '生命保険料控除',
                    used: deductions.lifeInsurance,
                    limit: lifeData.totalMax,
                    remaining: lifeData.totalMax - Math.min(deductions.lifeInsurance, lifeData.totalMax),
                    unit: '円',
                    status: this.getUsageStatus(Math.min(deductions.lifeInsurance, lifeData.totalMax), lifeData.totalMax),
                    recommendation: deductions.lifeInsurance < 80000 ?
                        '控除を最大化するには年24万円の保険料が必要' :
                        deductions.lifeInsurance >= lifeData.totalMax ?
                            '最大限活用中！' :
                            '控除上限に近づいています'
                };
                break;

            case 'earthquakeInsurance':
                const earthquakeData = this.deductionLimits['地震保険料控除'];
                info = {
                    name: '地震保険料控除',
                    used: Math.min(deductions.earthquakeInsurance, earthquakeData.max),
                    limit: earthquakeData.max,
                    remaining: earthquakeData.max - Math.min(deductions.earthquakeInsurance, earthquakeData.max),
                    unit: '円',
                    status: this.getUsageStatus(Math.min(deductions.earthquakeInsurance, earthquakeData.max), earthquakeData.max),
                    recommendation: deductions.earthquakeInsurance < earthquakeData.max ?
                        `まだ${this.formatShortCurrency(earthquakeData.max - Math.min(deductions.earthquakeInsurance, earthquakeData.max))}の枠があります` :
                        '最大限活用中！'
                };
                break;

            case 'furusato':
                // Furusato nozei limit is income-dependent, so we'll show what was used
                info = {
                    name: 'ふるさと納税',
                    used: deductions.furusato,
                    limit: null, // Will be calculated based on income
                    remaining: null,
                    unit: '円',
                    status: deductions.furusato > 0 ? 'good' : 'unused',
                    recommendation: deductions.furusato === 0 ?
                        '実質2,000円で返礼品がもらえる節税策' :
                        `活用中（${this.formatShortCurrency(deductions.furusato)}寄付）`
                };
                break;
        }

        return info;
    }

    getUsageStatus(used, limit) {
        if (used === 0) return 'unused';
        const percentage = (used / limit) * 100;
        if (percentage >= 100) return 'excellent';
        if (percentage >= 70) return 'good';
        if (percentage >= 30) return 'warning';
        return 'danger';
    }

    createStatusCard(info) {
        const card = document.createElement('div');
        card.className = `deduction-status-card ${info.highlight ? 'highlight-card' : ''}`;

        const percentage = info.limit ? Math.min((info.used / info.limit) * 100, 100) : 0;
        const statusClass = info.status;
        const statusIcon = this.getStatusIcon(info.status);

        card.innerHTML = `
            <div class="deduction-header">
                <h4>${info.name}</h4>
                <span class="status-badge ${statusClass}">${statusIcon}</span>
            </div>

            ${info.limit ? `
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill ${statusClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="progress-label">
                        <span>${percentage.toFixed(0)}%</span>
                        <span>${this.formatShortCurrency(info.used)} / ${this.formatShortCurrency(info.limit)}</span>
                    </div>
                </div>
            ` : `
                <div class="usage-amount">
                    <span>使用額: ${this.formatShortCurrency(info.used)}</span>
                </div>
            `}

            <div class="deduction-recommendation ${info.highlight ? 'highlight-text' : ''}">
                ${info.recommendation}
            </div>
        `;

        return card;
    }

    getStatusIcon(status) {
        const icons = {
            'excellent': '✅',
            'good': '👍',
            'warning': '⚠️',
            'danger': '🚨',
            'unused': '❌'
        };
        return icons[status] || '📊';
    }

    formatShortCurrency(amount) {
        if (amount >= 10000) {
            return `${(amount / 10000).toFixed(1)}万円`;
        }
        return `${Math.round(amount).toLocaleString()}円`;
    }
}

// Make available globally
window.DeductionTracker = DeductionTracker;
