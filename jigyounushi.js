/**
 * 個人事業主 節税最適化ツール - メインスクリプト
 * Japan Salary Calculator - Business Owner Mode
 */

class JigyounushiCalculator {
    constructor() {
        this.deductionLimits = null;
        this.taxTips = null;
        this.prefectureData = this.getPrefectureData();
        this.init();
    }

    async init() {
        try {
            // Load deduction limits and tax tips data
            const [deductionRes, tipsRes] = await Promise.all([
                fetch('data/deduction-limits.json'),
                fetch('data/tax-tips.json')
            ]);

            this.deductionLimits = await deductionRes.json();
            this.taxTips = await tipsRes.json();

            this.initializeEventListeners();
            this.initializeUI();
        } catch (error) {
            console.error('初期化エラー:', error);
            alert('データの読み込みに失敗しました。ページを再読み込みしてください。');
        }
    }

    initializeEventListeners() {
        const form = document.getElementById('jigyounushiForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCalculation();
            });
        }

        // Expense mode toggle
        const expenseModeRadios = document.querySelectorAll('input[name="expenseMode"]');
        expenseModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleExpenseMode(e.target.value);
            });
        });

        // Spouse checkbox
        const spouseCheckbox = document.getElementById('hasSpouse');
        if (spouseCheckbox) {
            spouseCheckbox.addEventListener('change', (e) => {
                document.getElementById('spouseIncome').style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Senjyusha checkbox
        const senjyushaCheckbox = document.getElementById('aoiroSenjyusha');
        if (senjyushaCheckbox) {
            senjyushaCheckbox.addEventListener('change', (e) => {
                document.getElementById('senjyushaAmount').style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Number formatting for man-en inputs
        this.setupNumberFormatting();
    }

    initializeUI() {
        // Auto-calculate detailed expenses total
        const expenseInputs = document.querySelectorAll('.expense-item');
        expenseInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.calculateTotalExpense();
            });
        });
    }

    toggleExpenseMode(mode) {
        const simpleInput = document.getElementById('simpleExpenseInput');
        const detailedInput = document.getElementById('detailedExpenseInput');

        if (mode === 'simple') {
            simpleInput.style.display = 'block';
            detailedInput.style.display = 'none';
        } else {
            simpleInput.style.display = 'none';
            detailedInput.style.display = 'block';
        }
    }

    calculateTotalExpense() {
        const expenseInputs = document.querySelectorAll('.expense-item');
        let total = 0;
        expenseInputs.forEach(input => {
            const value = this.parseManEnNumber(input.value);
            total += value;
        });
        // Update total display if needed
        console.log('Total expenses:', total);
    }

    setupNumberFormatting() {
        const numberInputs = [
            'businessRevenue', 'totalExpense', 'exp_purchase', 'exp_rent',
            'exp_utilities', 'exp_communication', 'exp_transportation',
            'exp_entertainment', 'exp_supplies', 'exp_other',
            'shoukiboKyousai', 'keieiSafety', 'ideco', 'furusato',
            'lifeInsurance', 'earthquakeInsurance', 'medicalExpense',
            'spouseIncomeAmount', 'senjyushaMonthly'
        ];

        numberInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('blur', (e) => {
                    const value = this.parseManEnNumber(e.target.value);
                    if (value > 0) {
                        e.target.value = value.toFixed(0);
                    }
                });
            }
        });
    }

    parseManEnNumber(value) {
        if (!value) return 0;
        const cleaned = String(value).replace(/[,，]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num * 10000; // Convert man-en to yen
    }

    handleCalculation() {
        try {
            const formData = this.collectFormData();
            const results = this.performCalculations(formData);
            this.displayResults(results, formData);
        } catch (error) {
            console.error('計算エラー:', error);
            alert('計算中にエラーが発生しました: ' + error.message);
        }
    }

    collectFormData() {
        // Basic info
        const businessRevenue = this.parseManEnNumber(document.getElementById('businessRevenue').value);
        const age = parseInt(document.getElementById('age').value, 10);
        const prefecture = document.getElementById('prefecture').value;
        const filingType = document.getElementById('filingType').value;

        // Expenses
        const expenseMode = document.querySelector('input[name="expenseMode"]:checked').value;
        let totalExpense = 0;

        if (expenseMode === 'simple') {
            totalExpense = this.parseManEnNumber(document.getElementById('totalExpense').value);
        } else {
            const expenseInputs = document.querySelectorAll('.expense-item');
            expenseInputs.forEach(input => {
                totalExpense += this.parseManEnNumber(input.value);
            });
        }

        // Deductions
        const aoiroDeduction = parseInt(document.getElementById('aoiroDeduction').value, 10);
        const shoukiboKyousai = this.parseManEnNumber(document.getElementById('shoukiboKyousai').value);
        const keieiSafety = this.parseManEnNumber(document.getElementById('keieiSafety').value);
        const ideco = this.parseManEnNumber(document.getElementById('ideco').value);
        const furusato = this.parseManEnNumber(document.getElementById('furusato').value);
        const lifeInsurance = this.parseManEnNumber(document.getElementById('lifeInsurance').value);
        const earthquakeInsurance = this.parseManEnNumber(document.getElementById('earthquakeInsurance').value);
        const medicalExpense = this.parseManEnNumber(document.getElementById('medicalExpense').value);

        // Family
        const hasSpouse = document.getElementById('hasSpouse').checked;
        const spouseIncome = hasSpouse ? this.parseManEnNumber(document.getElementById('spouseIncomeAmount').value) : 0;
        const dependents = parseInt(document.getElementById('dependents').value, 10) || 0;
        const aoiroSenjyusha = document.getElementById('aoiroSenjyusha').checked;
        const senjyushaMonthly = aoiroSenjyusha ? this.parseManEnNumber(document.getElementById('senjyushaMonthly').value) : 0;

        return {
            businessRevenue,
            age,
            prefecture,
            filingType,
            totalExpense,
            aoiroDeduction,
            shoukiboKyousai: shoukiboKyousai * 12, // Convert to yearly
            keieiSafety: keieiSafety * 12, // Convert to yearly
            ideco: ideco * 12, // Convert to yearly
            furusato,
            lifeInsurance,
            earthquakeInsurance,
            medicalExpense,
            hasSpouse,
            spouseIncome,
            dependents,
            aoiroSenjyusha,
            senjyushaYearly: senjyushaMonthly * 12
        };
    }

    performCalculations(data) {
        // 1. Calculate business income (事業所得)
        let businessIncome = data.businessRevenue - data.totalExpense - data.aoiroDeduction;

        // Deduct senjyusha salary if applicable
        if (data.aoiroSenjyusha && data.senjyushaYearly > 0) {
            businessIncome -= data.senjyushaYearly;
        }

        // 2. Calculate deductions (控除)
        const socialInsuranceDeduction = this.calculateSocialInsurance(businessIncome, data.age, data.prefecture);

        // Income deductions
        let totalDeductions = 480000; // 基礎控除 (2024年)

        // Small business mutual aid (小規模企業共済)
        totalDeductions += data.shoukiboKyousai;

        // iDeCo
        totalDeductions += data.ideco;

        // Social insurance premiums
        totalDeductions += socialInsuranceDeduction.total;

        // Life insurance
        const lifeInsuranceDeduction = this.calculateLifeInsuranceDeduction(data.lifeInsurance);
        totalDeductions += lifeInsuranceDeduction;

        // Earthquake insurance
        const earthquakeInsuranceDeduction = Math.min(data.earthquakeInsurance, 50000);
        totalDeductions += earthquakeInsuranceDeduction;

        // Medical expenses
        const medicalDeduction = Math.max(0, data.medicalExpense - 100000);
        totalDeductions += medicalDeduction;

        // Spouse deduction
        if (data.hasSpouse && !data.aoiroSenjyusha && data.spouseIncome <= 480000) {
            totalDeductions += 380000;
        }

        // Dependent deduction
        totalDeductions += data.dependents * 380000;

        // 3. Calculate taxable income (課税所得)
        const taxableIncome = Math.max(0, businessIncome - totalDeductions);

        // 4. Calculate income tax (所得税)
        const incomeTax = this.calculateIncomeTax(taxableIncome);

        // 5. Calculate resident tax (住民税)
        const residentTax = this.calculateResidentTax(taxableIncome, data.prefecture);

        // 6. Calculate furusato nozei credit
        const furusatoCredit = data.furusato > 2000 ? data.furusato - 2000 : 0;
        const adjustedResidentTax = Math.max(0, residentTax - furusatoCredit);

        // 7. Calculate net income (手取り)
        const netIncome = businessIncome - incomeTax - adjustedResidentTax - socialInsuranceDeduction.total;

        return {
            businessRevenue: data.businessRevenue,
            totalExpense: data.totalExpense,
            aoiroDeduction: data.aoiroDeduction,
            senjyushaYearly: data.senjyushaYearly,
            businessIncome,
            totalDeductions,
            taxableIncome,
            incomeTax,
            residentTax: adjustedResidentTax,
            originalResidentTax: residentTax,
            furusatoCredit,
            kokuho: socialInsuranceDeduction.kokuho,
            nenkin: socialInsuranceDeduction.nenkin,
            netIncome,
            // Pass through for deduction tracker
            deductions: {
                aoiroDeduction: data.aoiroDeduction,
                shoukiboKyousai: data.shoukiboKyousai,
                keieiSafety: data.keieiSafety,
                ideco: data.ideco,
                furusato: data.furusato,
                lifeInsurance: data.lifeInsurance,
                earthquakeInsurance: data.earthquakeInsurance,
                medicalExpense: data.medicalExpense
            }
        };
    }

    calculateSocialInsurance(businessIncome, age, prefecture) {
        // National Health Insurance (国民健康保険)
        const prefData = this.prefectureData[prefecture];
        const kokuhoIncome = Math.max(0, businessIncome - 430000); // 基礎控除後
        const kokuho = Math.round(kokuhoIncome * prefData.kokuhoRate + 45000); // 地域別料率 + 均等割

        // National Pension (国民年金) - Fixed amount for 2024
        const nenkin = 203760; // 月額16,980円 × 12ヶ月

        return {
            kokuho,
            nenkin,
            total: kokuho + nenkin
        };
    }

    calculateLifeInsuranceDeduction(premium) {
        if (premium <= 20000) return premium;
        if (premium <= 40000) return premium * 0.5 + 10000;
        if (premium <= 80000) return premium * 0.25 + 20000;
        return 40000; // Maximum
    }

    calculateIncomeTax(taxableIncome) {
        // Progressive tax rates for 2024
        if (taxableIncome <= 1950000) {
            return taxableIncome * 0.05;
        } else if (taxableIncome <= 3300000) {
            return taxableIncome * 0.10 - 97500;
        } else if (taxableIncome <= 6950000) {
            return taxableIncome * 0.20 - 427500;
        } else if (taxableIncome <= 9000000) {
            return taxableIncome * 0.23 - 636000;
        } else if (taxableIncome <= 18000000) {
            return taxableIncome * 0.33 - 1536000;
        } else if (taxableIncome <= 40000000) {
            return taxableIncome * 0.40 - 2796000;
        } else {
            return taxableIncome * 0.45 - 4796000;
        }
    }

    calculateResidentTax(taxableIncome, prefecture) {
        // 住民税 = 所得割 (10%) + 均等割 (5,000円程度)
        const prefData = this.prefectureData[prefecture];
        const shotokuWari = taxableIncome * 0.10;
        const kintouWari = prefData.residentTaxFlat || 5000;
        return Math.round(shotokuWari + kintouWari);
    }

    displayResults(results, formData) {
        // Show results section
        const resultsSection = document.getElementById('results');
        resultsSection.classList.remove('hidden');

        // Display calculation results
        this.safeUpdateElement('result_revenue', this.formatCurrency(results.businessRevenue));
        this.safeUpdateElement('result_expense', this.formatCurrency(results.totalExpense));
        this.safeUpdateElement('result_aoiro', this.formatCurrency(results.aoiroDeduction));
        this.safeUpdateElement('result_business_income', this.formatCurrency(results.businessIncome));

        this.safeUpdateElement('result_income_tax', this.formatCurrency(results.incomeTax));
        this.safeUpdateElement('result_resident_tax', this.formatCurrency(results.residentTax));
        this.safeUpdateElement('result_kokuho', this.formatCurrency(results.kokuho));
        this.safeUpdateElement('result_nenkin', this.formatCurrency(results.nenkin));
        this.safeUpdateElement('result_net_income', this.formatCurrency(results.netIncome));

        // Initialize and display deduction tracker
        if (window.DeductionTracker) {
            const tracker = new DeductionTracker(this.deductionLimits);
            tracker.displayDeductionStatus(results.deductions, formData);
        }

        // Initialize and display tax optimizer
        if (window.TaxOptimizer) {
            const optimizer = new TaxOptimizer(this.taxTips, this.deductionLimits);
            const tips = optimizer.generateTaxSavingTips(results, formData);
            optimizer.displayTaxSavingTips(tips);
        }

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    safeUpdateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.round(amount));
    }

    getPrefectureData() {
        // Prefecture-specific data (simplified version - uses same data as main calculator)
        return {
            tokyo: { kokuhoRate: 0.099, residentTaxFlat: 5000, healthInsuranceRate: 0.10, careInsuranceRate: 0.0182 },
            osaka: { kokuhoRate: 0.103, residentTaxFlat: 5300, healthInsuranceRate: 0.1030, careInsuranceRate: 0.0186 },
            aichi: { kokuhoRate: 0.0984, residentTaxFlat: 5000, healthInsuranceRate: 0.10170, careInsuranceRate: 0.01790 },
            fukuoka: { kokuhoRate: 0.1022, residentTaxFlat: 5000, healthInsuranceRate: 0.1032, careInsuranceRate: 0.01820 },
            hokkaido: { kokuhoRate: 0.1065, residentTaxFlat: 5000, healthInsuranceRate: 0.1044, careInsuranceRate: 0.01950 },
            kanagawa: { kokuhoRate: 0.0991, residentTaxFlat: 5500, healthInsuranceRate: 0.10110, careInsuranceRate: 0.01810 },
            saitama: { kokuhoRate: 0.0971, residentTaxFlat: 5000, healthInsuranceRate: 0.09980, careInsuranceRate: 0.01760 },
            chiba: { kokuhoRate: 0.0983, residentTaxFlat: 5000, healthInsuranceRate: 0.09930, careInsuranceRate: 0.01720 },
            hyogo: { kokuhoRate: 0.1015, residentTaxFlat: 5300, healthInsuranceRate: 0.10260, careInsuranceRate: 0.01830 },
            // Add more prefectures with default values
            default: { kokuhoRate: 0.10, residentTaxFlat: 5000, healthInsuranceRate: 0.10, careInsuranceRate: 0.0182 }
        };
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new JigyounushiCalculator();
});
