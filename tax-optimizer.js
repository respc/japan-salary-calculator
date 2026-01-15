/**
 * Tax Optimizer - 節税提案エンジン
 * Generates personalized tax-saving recommendations
 */

class TaxOptimizer {
    constructor(taxTips, deductionLimits) {
        this.taxTips = taxTips || [];
        this.deductionLimits = deductionLimits || {};
    }

    /**
     * Generate tax saving tips based on user's current situation
     */
    generateTaxSavingTips(results, formData) {
        const tips = [];

        // Return empty tips if no data available
        if (!this.taxTips || !Array.isArray(this.taxTips) || this.taxTips.length === 0) {
            return tips;
        }

        const marginalTaxRate = this.calculateMarginalTaxRate(results.taxableIncome);

        this.taxTips.forEach(tip => {
            // Check if tip is applicable
            if (!this.isTipApplicable(tip, results, formData)) {
                return;
            }

            // Calculate potential savings
            const potentialSaving = this.calculatePotentialSaving(tip, results, formData, marginalTaxRate);

            if (potentialSaving && potentialSaving.total > 0) {
                tips.push({
                    ...tip,
                    potentialSaving,
                    priority: this.calculatePriority(tip, potentialSaving)
                });
            }
        });

        // Sort by priority (descending)
        tips.sort((a, b) => b.priority - a.priority);

        return tips;
    }

    isTipApplicable(tip, results, formData) {
        // Check minimum income requirement
        if (tip.minIncome && results.businessIncome < tip.minIncome) {
            return false;
        }

        // Check specific requirements
        if (tip.requiresSpouse && !formData.hasSpouse) {
            return false;
        }

        if (tip.requiresAoiro && formData.filingType !== 'aoiro') {
            return false;
        }

        // Check if already maxed out
        if (tip.targetDeduction) {
            const currentUsage = this.getCurrentDeductionUsage(tip.targetDeduction, formData);
            const limit = this.getDeductionLimit(tip.targetDeduction);

            if (currentUsage >= limit) {
                return false; // Already maxed out
            }
        }

        return true;
    }

    getCurrentDeductionUsage(deductionKey, formData) {
        const mapping = {
            'keiei_safety': formData.keieiSafety || 0,
            'shoukibo_kyousai': formData.shoukiboKyousai || 0,
            'ideco': formData.ideco || 0,
            'furusato': formData.furusato || 0,
            'aoiro_deduction': formData.aoiroDeduction || 0
        };

        return mapping[deductionKey] || 0;
    }

    getDeductionLimit(deductionKey) {
        const mapping = {
            'keiei_safety': 2400000,
            'shoukibo_kyousai': 840000,
            'ideco': 816000,
            'furusato': 9999999, // Income-dependent
            'aoiro_deduction': 650000
        };

        return mapping[deductionKey] || 0;
    }

    calculatePotentialSaving(tip, results, formData, marginalTaxRate) {
        let increaseAmount = 0;
        let incomeTaxSaving = 0;
        let residentTaxSaving = 0;
        let kokuhoSaving = 0;

        switch (tip.id) {
            case 'tip_001': // 経営セーフティ共済
                increaseAmount = 2400000 - (formData.keieiSafety || 0);
                if (increaseAmount > 0) {
                    // Expense deduction - reduces business income directly
                    incomeTaxSaving = increaseAmount * marginalTaxRate;
                    residentTaxSaving = increaseAmount * 0.10;
                    kokuhoSaving = increaseAmount * 0.0330; // Approximate kokuho rate
                }
                break;

            case 'tip_002': // 小規模企業共済増額
                increaseAmount = 840000 - (formData.shoukiboKyousai || 0);
                if (increaseAmount > 0) {
                    incomeTaxSaving = increaseAmount * marginalTaxRate;
                    residentTaxSaving = increaseAmount * 0.10;
                    kokuhoSaving = increaseAmount * 0.0330;
                }
                break;

            case 'tip_003': // 青色事業専従者給与
                if (!formData.aoiroSenjyusha && formData.hasSpouse) {
                    increaseAmount = 960000; // Recommended 8万円/月 × 12
                    // Lose spouse deduction (38万円) but gain expense (96万円)
                    const netBenefit = increaseAmount - 380000;
                    incomeTaxSaving = netBenefit * marginalTaxRate;
                    residentTaxSaving = netBenefit * 0.10;
                    kokuhoSaving = netBenefit * 0.0330;
                }
                break;

            case 'tip_004': // iDeCo増額
                increaseAmount = 816000 - (formData.ideco || 0);
                if (increaseAmount > 0) {
                    incomeTaxSaving = increaseAmount * marginalTaxRate;
                    residentTaxSaving = increaseAmount * 0.10;
                    kokuhoSaving = increaseAmount * 0.0330;
                }
                break;

            case 'tip_005': // ふるさと納税
                if ((formData.furusato || 0) === 0) {
                    // Estimate furusato limit (simplified)
                    const estimatedLimit = Math.min(285000, results.originalResidentTax * 0.20 + 2000);
                    increaseAmount = estimatedLimit;
                    // Actual benefit is return value (30%) minus 2000 yen cost
                    const actualBenefit = estimatedLimit * 0.30 - 2000;
                    incomeTaxSaving = actualBenefit * 0.5; // Split benefit
                    residentTaxSaving = actualBenefit * 0.5;
                }
                break;

            case 'tip_006': // 自宅兼事務所
                // Estimate potential: Rent 12万円/月 × 30% × 12 = 43.2万円/year
                increaseAmount = 432000;
                incomeTaxSaving = increaseAmount * marginalTaxRate;
                residentTaxSaving = increaseAmount * 0.10;
                kokuhoSaving = increaseAmount * 0.0330;
                break;

            case 'tip_010': // 青色申告65万円控除
                if (formData.aoiroDeduction < 650000) {
                    increaseAmount = 650000 - formData.aoiroDeduction;
                    incomeTaxSaving = increaseAmount * marginalTaxRate;
                    residentTaxSaving = increaseAmount * 0.10;
                    kokuhoSaving = increaseAmount * 0.0330;
                }
                break;

            default:
                // Generic calculation for other tips
                if (tip.taxSavingExample) {
                    increaseAmount = tip.taxSavingExample.increaseAmount || 0;
                    incomeTaxSaving = tip.taxSavingExample.incomeTaxSaving || 0;
                    residentTaxSaving = tip.taxSavingExample.residentTaxSaving || 0;
                    kokuhoSaving = tip.taxSavingExample.kokuhoSaving || 0;
                }
        }

        const total = incomeTaxSaving + residentTaxSaving + kokuhoSaving;

        return {
            increaseAmount,
            incomeTaxSaving: Math.round(incomeTaxSaving),
            residentTaxSaving: Math.round(residentTaxSaving),
            kokuhoSaving: Math.round(kokuhoSaving),
            total: Math.round(total)
        };
    }

    calculateMarginalTaxRate(taxableIncome) {
        if (taxableIncome <= 1950000) return 0.05;
        if (taxableIncome <= 3300000) return 0.10;
        if (taxableIncome <= 6950000) return 0.20;
        if (taxableIncome <= 9000000) return 0.23;
        if (taxableIncome <= 18000000) return 0.33;
        if (taxableIncome <= 40000000) return 0.40;
        return 0.45;
    }

    calculatePriority(tip, potentialSaving) {
        // Priority = (tax saving / difficulty) - cashflow impact factor
        const basePriority = tip.priority || 50;
        const savingBonus = potentialSaving.total / 10000; // Bonus for higher savings
        const difficultyPenalty = tip.difficulty * 5;
        const cashflowPenalty = tip.cashflowImpact * 3;

        return basePriority + savingBonus - difficultyPenalty - cashflowPenalty;
    }

    displayTaxSavingTips(tips) {
        const container = document.getElementById('taxTipsContainer');
        if (!container) return;

        container.innerHTML = '';

        // Handle empty tips case
        if (!tips || tips.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">現在の設定に基づく追加の節税提案はありません。</p>';
            const totalElement = document.getElementById('totalSavingPotential');
            if (totalElement) {
                totalElement.textContent = this.formatCurrency(0);
            }
            return;
        }

        // Calculate total potential savings
        const totalPotential = tips.reduce((sum, tip) => sum + (tip.potentialSaving?.total || 0), 0);
        const totalElement = document.getElementById('totalSavingPotential');
        if (totalElement) {
            totalElement.textContent = this.formatCurrency(totalPotential);
        }

        // Show top 3 tips for free version (in production, show all for premium)
        const displayTips = tips.slice(0, 3);

        displayTips.forEach((tip, index) => {
            const tipCard = this.createTipCard(tip, index + 1);
            container.appendChild(tipCard);
        });

        // Show "more tips available" message if there are more
        if (tips.length > 3) {
            const moreCard = this.createMoreTipsCard(tips.length - 3);
            container.appendChild(moreCard);
        }
    }

    createTipCard(tip, rank) {
        const card = document.createElement('div');
        card.className = 'tax-tip-card';

        const priorityLabel = this.getPriorityLabel(tip.priority || 50);
        const difficulty = tip.difficulty || 2;
        const difficultyStars = '⭐'.repeat(Math.max(1, 4 - difficulty));
        const potentialSaving = tip.potentialSaving || { total: 0, incomeTaxSaving: 0, residentTaxSaving: 0, kokuhoSaving: 0 };

        card.innerHTML = `
            <div class="tip-header">
                <div class="tip-rank">#${rank}</div>
                <div class="tip-priority ${priorityLabel.class}">${priorityLabel.text}</div>
            </div>

            <h4 class="tip-title">✨ ${tip.title || '節税提案'}</h4>
            <p class="tip-description">${tip.description || ''}</p>

            <div class="tip-savings">
                <div class="savings-total">
                    <span class="label">💰 予想節税効果:</span>
                    <span class="value">${this.formatCurrency(potentialSaving.total)}/年</span>
                </div>
                <div class="savings-breakdown">
                    <span>所得税: ${this.formatShortCurrency(potentialSaving.incomeTaxSaving)}</span>
                    <span>住民税: ${this.formatShortCurrency(potentialSaving.residentTaxSaving)}</span>
                    <span>国保: ${this.formatShortCurrency(potentialSaving.kokuhoSaving)}</span>
                </div>
            </div>

            <div class="tip-meta">
                <span class="difficulty">実施難易度: ${difficultyStars}</span>
                <span class="cashflow">現金流影響: ${this.getCashflowLabel(tip.cashflowImpact || 0)}</span>
            </div>

            ${tip.steps && tip.steps.length > 0 ? `
                <details class="tip-steps">
                    <summary>📋 実施手順を見る</summary>
                    <ol>
                        ${tip.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </details>
            ` : ''}

            ${tip.warnings && tip.warnings.length > 0 ? `
                <div class="tip-warnings">
                    <strong>⚠️ 注意点:</strong>
                    <ul>
                        ${tip.warnings.map(warning => `<li>${warning}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            ${tip.links ? `
                <div class="tip-actions">
                    ${tip.links.official ? `<a href="${tip.links.official}" target="_blank" class="tip-link">公式サイト →</a>` : ''}
                    ${tip.links.guide ? `<a href="${tip.links.guide}" class="tip-link">詳細ガイド →</a>` : ''}
                </div>
            ` : ''}
        `;

        return card;
    }

    createMoreTipsCard(count) {
        const card = document.createElement('div');
        card.className = 'more-tips-card';

        card.innerHTML = `
            <div class="more-tips-content">
                <h4>🔒 他に${count}個の節税方法があります</h4>
                <p>Premiumプランで全ての節税提案を確認できます</p>
                <div class="upgrade-benefits">
                    <ul>
                        <li>✓ 完全な節税提案リスト（10-15個）</li>
                        <li>✓ 詳細な実施ステップ</li>
                        <li>✓ PDF報告書ダウンロード</li>
                        <li>✓ 月次更新通知</li>
                    </ul>
                </div>
                <button class="upgrade-btn">Premiumにアップグレード - ¥2,980/月</button>
            </div>
        `;

        return card;
    }

    getPriorityLabel(priority) {
        if (priority >= 95) return { text: '最優先', class: 'priority-highest' };
        if (priority >= 85) return { text: '高優先', class: 'priority-high' };
        if (priority >= 70) return { text: '中優先', class: 'priority-medium' };
        return { text: '低優先', class: 'priority-low' };
    }

    getCashflowLabel(impact) {
        if (impact === 0) return '影響なし ✅';
        if (impact === 1) return '小 💵';
        if (impact === 2) return '中 💰';
        return '大 💸';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.round(amount));
    }

    formatShortCurrency(amount) {
        if (amount >= 10000) {
            return `${(amount / 10000).toFixed(1)}万円`;
        }
        return `${Math.round(amount).toLocaleString()}円`;
    }
}

// Make available globally
window.TaxOptimizer = TaxOptimizer;
