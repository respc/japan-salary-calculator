class JapanSalaryCalculator {
    constructor() {
        try {
            this.RATES = {
                EMPLOYMENT_INSURANCE: 0.006,
                PENSION_INSURANCE: 0.183,
                HEALTH_INSURANCE_TOKYO: 0.0998,
                CARE_INSURANCE: 0.0182,
                RECONSTRUCTION_SURTAX: 1.021,
            };
            this.CAPS = {
                HEALTH_INSURANCE_SMR: 1390000,  // 協会けんぽ標準報酬月額上限（2024年第50等級）
                PENSION_INSURANCE_SMR: 650000,  // 厚生年金標準報酬月額上限（2024年第32等級）
                HEALTH_INSURANCE_SBA_YEARLY: 5730000,  // 健康保険賞与年間上限
                PENSION_INSURANCE_SBA_PER_PAYMENT: 1500000,  // 厚生年金賞与1回あたり上限
            };
            this.prefectureData = this.initializePrefectureData();
            this.currentRecommendations = [];
            this.currentData = null;
            this.selectedPlans = [];
            
            this.initializeEventListeners();
            this.setupNumberFormatting();
        } catch (error) {
            console.error('Calculator initialization failed:', error);
            this.showError('システムの初期化に失敗しました。ページを再読み込みしてください。');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 12px 16px;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-width: 300px;
            font-size: 0.9rem;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    validateInput(value, min = 0, max = Infinity, fieldName = '') {
        if (value === null || value === undefined || isNaN(value)) {
            throw new Error(`${fieldName}の値が無効です`);
        }
        if (value < min || value > max) {
            throw new Error(`${fieldName}は${min}以上${max}以下で入力してください`);
        }
        return true;
    }

    initializePrefectureData() {
        return {
            tokyo: { 
                name: '東京都', 
                flatRate: 5000,
                prefTaxRate: 0.04, // 都道府県民税
                cityTaxRate: 0.06, // 市区町村民税
                healthInsuranceRate: 0.0998, // 協会けんぽ東京都
                careInsuranceRate: 0.0182,
                kokuhoRate: 0.073, // 国民健康保険料率（自営業用）
                regionalCredit: 0, // 地域特別控除
                majorCities: {
                    'special_ward': { name: '特別区', cityTaxRate: 0.06 },
                    'hachioji': { name: '八王子市', cityTaxRate: 0.06 },
                    'machida': { name: '町田市', cityTaxRate: 0.06 }
                }
            },
            osaka: { 
                name: '大阪府', 
                flatRate: 5300,
                prefTaxRate: 0.04,
                cityTaxRate: 0.06,
                healthInsuranceRate: 0.1030, // 協会けんぽ大阪府
                careInsuranceRate: 0.0182,
                kokuhoRate: 0.078,
                regionalCredit: 0,
                majorCities: {
                    'osaka_city': { name: '大阪市', cityTaxRate: 0.06 },
                    'sakai': { name: '堺市', cityTaxRate: 0.06 },
                    'higashiosaka': { name: '東大阪市', cityTaxRate: 0.06 }
                }
            },
            kanagawa: { 
                name: '神奈川県', 
                flatRate: 5300,
                prefTaxRate: 0.045, // 神奈川県は超過課税
                cityTaxRate: 0.06,
                healthInsuranceRate: 0.0998,
                careInsuranceRate: 0.0182,
                kokuhoRate: 0.075,
                regionalCredit: 0,
                majorCities: {
                    'yokohama': { name: '横浜市', cityTaxRate: 0.06 },
                    'kawasaki': { name: '川崎市', cityTaxRate: 0.06 },
                    'sagamihara': { name: '相模原市', cityTaxRate: 0.06 }
                }
            },
            aichi: {
                name: '愛知県',
                flatRate: 5000,
                prefTaxRate: 0.04,
                cityTaxRate: 0.06,
                healthInsuranceRate: 0.1000,
                careInsuranceRate: 0.0182,
                kokuhoRate: 0.076,
                regionalCredit: 0,
                majorCities: {
                    'nagoya': { name: '名古屋市', cityTaxRate: 0.06 }
                }
            },
            hyogo: {
                name: '兵庫県',
                flatRate: 5300,
                prefTaxRate: 0.04,
                cityTaxRate: 0.06,
                healthInsuranceRate: 0.1040,
                careInsuranceRate: 0.0182,
                kokuhoRate: 0.077,
                regionalCredit: 0,
                majorCities: {
                    'kobe': { name: '神戸市', cityTaxRate: 0.06 }
                }
            },
            fukuoka: {
                name: '福岡県',
                flatRate: 5000,
                prefTaxRate: 0.04,
                cityTaxRate: 0.06,
                healthInsuranceRate: 0.1036,
                careInsuranceRate: 0.0182,
                kokuhoRate: 0.074,
                regionalCredit: 0,
                majorCities: {
                    'fukuoka_city': { name: '福岡市', cityTaxRate: 0.06 }
                }
            },
            hokkaido: {
                name: '北海道',
                flatRate: 5000,
                prefTaxRate: 0.04,
                cityTaxRate: 0.06,
                healthInsuranceRate: 0.1030,
                careInsuranceRate: 0.0182,
                kokuhoRate: 0.072,
                regionalCredit: 0,
                majorCities: {
                    'sapporo': { name: '札幌市', cityTaxRate: 0.06 }
                }
            },
            miyagi: {
                name: '宮城県',
                flatRate: 5000,
                prefTaxRate: 0.04,
                cityTaxRate: 0.06,
                healthInsuranceRate: 0.1000,
                careInsuranceRate: 0.0182,
                kokuhoRate: 0.073,
                regionalCredit: 0,
                majorCities: {
                    'sendai': { name: '仙台市', cityTaxRate: 0.06 }
                }
            },
            kyoto: {
                name: '京都府',
                flatRate: 5300,
                prefTaxRate: 0.04,
                cityTaxRate: 0.06,
                healthInsuranceRate: 0.1015,
                careInsuranceRate: 0.0182,
                kokuhoRate: 0.076,
                regionalCredit: 0,
                majorCities: {
                    'kyoto_city': { name: '京都市', cityTaxRate: 0.06 }
                }
            },
            other: { 
                name: 'その他', 
                flatRate: 5000,
                prefTaxRate: 0.04,
                cityTaxRate: 0.06,
                healthInsuranceRate: 0.1020, // 全国平均
                careInsuranceRate: 0.0182,
                kokuhoRate: 0.075,
                regionalCredit: 0,
                majorCities: {}
            }
        };
    }

    setupNumberFormatting() {
        const numberInputs = ['grossSalary', 'lastYearSalary', 'bonus', 'companyHousing', 'sideIncome', 'sideExpenses', 'medicalExpenses', 'lifeInsurance', 'donation'];
        numberInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^\d.]/g, '');
                });
            }
        });
    }

    parseManEnNumber(value) {
        if (!value) return 0;
        const cleanValue = String(value).replace(/[^\d.]/g, '');
        return parseFloat(cleanValue) * 10000 || 0;
    }

    initializeEventListeners() {
        const form = document.getElementById('salaryForm');
        if (!form) {
            throw new Error('Required form element not found');
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCalculation();
        });
    }

    showLoading(show = true) {
        const submitBtn = document.querySelector('.calculate-btn');
        if (!submitBtn) return;

        if (show) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '計算中... <span style="display: inline-block; animation: spin 1s linear infinite;">⟳</span>';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '計算する';
        }
    }

    async handleCalculation() {
        this.showLoading(true);
        try {
            // Add slight delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 100));
            this.calculateSalary();
        } finally {
            this.showLoading(false);
        }
    }

    calculateSalary() {
        try {
            const originalGrossSalary = this.parseManEnNumber(document.getElementById('grossSalary').value);
            const lastYearSalary = this.parseManEnNumber(document.getElementById('lastYearSalary').value);
            const age = parseInt(document.getElementById('age').value, 10);
            const prefectureKey = document.getElementById('prefecture').value;
            const employmentType = document.getElementById('employmentType').value;
            const bonus = this.parseManEnNumber(document.getElementById('bonus').value);
            const companyHousingMonthly = this.parseManEnNumber(document.getElementById('companyHousing').value);
            const sideIncome = this.parseManEnNumber(document.getElementById('sideIncome').value);
            const sideExpenses = this.parseManEnNumber(document.getElementById('sideExpenses').value);

            // Input validation
            this.validateInput(originalGrossSalary, 0, 100000000, '年収');
            this.validateInput(age, 18, 100, '年齢');
            this.validateInput(bonus, 0, 50000000, '賞与');
            this.validateInput(companyHousingMonthly, 0, 1000000, '社宅費');
            this.validateInput(sideIncome, 0, 50000000, '副業収入');
            this.validateInput(sideExpenses, 0, sideIncome, '副業経費');

            if (!originalGrossSalary || !age) {
                throw new Error('年収と年齢は必須項目です');
            }

            const companyHousingYearly = companyHousingMonthly * 12;
            // 社宅費は税後の手取りから差し引くため、課税所得からは引かない
            const taxableGrossSalary = originalGrossSalary;
            const sideNetIncome = Math.max(0, sideIncome - sideExpenses);

            const monthlySalaryTotal = originalGrossSalary - bonus;
            if (monthlySalaryTotal < 0) {
                throw new Error('賞与額が年収を超えています');
            }
            const monthlySalary = monthlySalaryTotal / 12;

            // Advanced options with validation
            const advancedOptions = this.getAdvancedOptions(sideNetIncome);

            const calculations = this.performCalculations({
                taxableGrossSalary,
                monthlySalary,
                bonus,
                lastYearSalary: lastYearSalary || taxableGrossSalary,
                age,
                prefectureKey,
                employmentType,
                companyHousingYearly,
                ...advancedOptions
            });

            const displayData = { 
                ...calculations, 
                originalGrossSalary, 
                companyHousingDeduction: companyHousingYearly, 
                bonus,
                sideIncome,
                sideExpenses,
                sideNetIncome
            };
            
            this.displayResults(displayData);
            
        } catch (error) {
            console.error('Calculation error:', error);
            this.showError(error.message || '計算中にエラーが発生しました');
        }
    }

    getAdvancedOptions(sideNetIncome) {
        try {
            const dependents = parseInt(document.getElementById('dependents').value, 10) || 0;
            const disabledDependents = parseInt(document.getElementById('disabledDependents').value, 10) || 0;
            
            this.validateInput(dependents, 0, 20, '扶養人数');
            this.validateInput(disabledDependents, 0, dependents, '障害者扶養人数');

            return {
                hasSpouse: document.getElementById('hasSpouse').value === 'yes',
                dependents: dependents,
                disabledDependents: disabledDependents,
                medicalExpenses: this.parseManEnNumber(document.getElementById('medicalExpenses').value),
                lifeInsurance: this.parseManEnNumber(document.getElementById('lifeInsurance').value),
                donation: this.parseManEnNumber(document.getElementById('donation').value),
                sideNetIncome: sideNetIncome
            };
        } catch (error) {
            throw new Error('詳細設定の値に問題があります: ' + error.message);
        }
    }

    performCalculations(params) {
        const socialInsurance = this.calculateSocialInsurance(params.monthlySalary, params.bonus, params.age, params.employmentType, params.prefectureKey);
        const salaryDeduction = this.calculateSalaryDeduction(params.taxableGrossSalary);

        // 副業所得の処理（給与収入に雑所得を合算）
        // 注：totalIncomeは正確には「総収入金額」。課税所得は後で給与所得控除を差し引いて計算
        const totalIncome = params.taxableGrossSalary + (params.sideNetIncome || 0);
        
        // 所得税用の控除額
        const basicDeduction = 480000;  // 基礎控除（所得税）
        const spouseDeduction = params.hasSpouse ? 380000 : 0;  // 配偶者控除（所得税）
        const dependentDeduction = params.dependents * 380000;  // 扶養控除（所得税）
        const disabledDependentDeduction = params.disabledDependents * 270000;  // 障害者控除（所得税）
        const lifeInsuranceDeduction = Math.min(params.lifeInsurance, 120000);
        const medicalDeduction = Math.max(0, params.medicalExpenses - 100000);
        const otherDeductionsTotal = medicalDeduction + lifeInsuranceDeduction + params.donation;

        // 所得税計算（副業所得込み）
        const totalDeductionsForIncomeTax = socialInsurance.total + salaryDeduction + basicDeduction + spouseDeduction + dependentDeduction + disabledDependentDeduction + otherDeductionsTotal;
        const taxableForIncomeTax = Math.max(0, totalIncome - totalDeductionsForIncomeTax);
        const incomeTax = this.calculateIncomeTax(taxableForIncomeTax);

        // 住民税計算（前年分、副業込み、地域別税率使用）
        const lastYearTotalIncome = params.lastYearSalary + (params.sideNetIncome || 0);
        const lastYearSocialInsurance = this.calculateSocialInsurance(lastYearTotalIncome / 12, 0, params.age, params.employmentType, params.prefectureKey).total;
        const lastYearSalaryDeduction = this.calculateSalaryDeduction(params.lastYearSalary);
        // 住民税用の控除額（所得税と金額が異なる）
        const disabledDependentDeductionResident = params.disabledDependents * 260000;  // 障害者控除（住民税）
        const totalDeductionsForResidentTax = lastYearSocialInsurance + lastYearSalaryDeduction + 430000 + (params.hasSpouse ? 330000 : 0) + (params.dependents * 330000) + disabledDependentDeductionResident + otherDeductionsTotal;
        const taxableForResidentTax = Math.max(0, lastYearTotalIncome - totalDeductionsForResidentTax);
        const residentTax = this.calculateResidentTax(taxableForResidentTax, params.prefectureKey);

        // 手取り計算（副業所得込み、社宅費控除）
        // 社宅費は給与から天引きされるため、税後の手取りから差し引く
        const netSalary = totalIncome - (socialInsurance.total + incomeTax + residentTax + (params.companyHousingYearly || 0));
        
        // 来年の住民税計算（今年の副業所得込み、地域別税率使用）
        const nextYearResidentTaxableIncome = Math.max(0, totalIncome - (socialInsurance.total + salaryDeduction + 430000 + (params.hasSpouse ? 330000 : 0) + (params.dependents * 330000) + disabledDependentDeductionResident + otherDeductionsTotal));
        const nextYearResidentTax = this.calculateResidentTax(nextYearResidentTaxableIncome, params.prefectureKey);
        
        const furusatoLimit = this.calculateFurusatoLimit(taxableForIncomeTax, nextYearResidentTax - this.prefectureData[params.prefectureKey].flatRate);

        return { 
            netSalary, 
            incomeTax, 
            residentTax, 
            socialInsurance, 
            nextYearResidentTax, 
            furusatoLimit,
            totalIncome,
            sideNetIncome: params.sideNetIncome || 0,
            employmentType: params.employmentType
        };
    }

    calculateSocialInsurance(monthlySalary, bonus, age, employmentType = 'seishain', prefectureKey = 'tokyo') {
        // 自営業者・フリーランスの場合は国民年金・国民健康保険
        if (employmentType === 'jieigyou' || employmentType === 'freelance') {
            return this.calculateJieigyouInsurance(monthlySalary * 12 + bonus, age, prefectureKey);
        }
        
        // アルバイト・パートの場合（条件により厚生年金なし）
        if (employmentType === 'part') {
            const yearlyIncome = monthlySalary * 12 + bonus;
            // 年収130万円未満または週20時間未満想定で社会保険なしのケース
            if (yearlyIncome < 1300000) {
                return this.calculatePartTimeInsurance(yearlyIncome, age, prefectureKey);
            }
        }
        
        // 正社員・契約社員の場合（地域別健康保険料率を使用）
        const prefData = this.prefectureData[prefectureKey];
        const smrHealth = Math.min(monthlySalary, this.CAPS.HEALTH_INSURANCE_SMR);
        const smrPension = Math.min(monthlySalary, this.CAPS.PENSION_INSURANCE_SMR);
        const sba = Math.floor(bonus / 1000) * 1000;  // 賞与は千円未満切り捨て

        const healthRate = prefData.healthInsuranceRate + (age >= 40 ? prefData.careInsuranceRate : 0);

        // 月額部分と賞与部分を分けて計算（正しい方法）
        const healthInsMonthly = smrHealth * 12 * healthRate / 2;
        const healthInsBonus = Math.min(sba, this.CAPS.HEALTH_INSURANCE_SBA_YEARLY) * healthRate / 2;
        const healthIns = healthInsMonthly + healthInsBonus;

        const pensionInsMonthly = smrPension * 12 * this.RATES.PENSION_INSURANCE / 2;
        const pensionInsBonus = Math.min(sba, this.CAPS.PENSION_INSURANCE_SBA_PER_PAYMENT) * this.RATES.PENSION_INSURANCE / 2;
        const pensionIns = pensionInsMonthly + pensionInsBonus;

        const employmentIns = (monthlySalary * 12 + bonus) * this.RATES.EMPLOYMENT_INSURANCE;

        const result = { health: Math.round(healthIns), pension: Math.round(pensionIns), employment: Math.round(employmentIns) };
        result.total = result.health + result.pension + result.employment;
        return result;
    }

    calculateJieigyouInsurance(yearlyIncome, age, prefectureKey = 'tokyo') {
        // 国民健康保険（地域別料率使用）
        const prefData = this.prefectureData[prefectureKey];
        const kokuhoIncome = Math.max(0, yearlyIncome - 430000); // 基礎控除後
        const healthIns = kokuhoIncome * prefData.kokuhoRate + 45000; // 地域別料率 + 均等割
        
        // 国民年金（定額、2024年度）
        const pensionIns = 196800; // 月額16,400円 × 12ヶ月
        
        // 雇用保険なし
        const employmentIns = 0;

        const result = { 
            health: Math.round(healthIns), 
            pension: Math.round(pensionIns), 
            employment: employmentIns,
            type: '国民保険'
        };
        result.total = result.health + result.pension + result.employment;
        return result;
    }

    calculatePartTimeInsurance(yearlyIncome, age, prefectureKey = 'tokyo') {
        // パート・アルバイトで社会保険なしの場合
        // 国民年金・国民健康保険を自分で加入想定
        return this.calculateJieigyouInsurance(yearlyIncome, age, prefectureKey);
    }

    calculateSalaryDeduction(grossSalary) {
        if (grossSalary <= 1625000) return 550000;
        if (grossSalary <= 1800000) return grossSalary * 0.4 - 100000;
        if (grossSalary <= 3600000) return grossSalary * 0.3 + 80000;
        if (grossSalary <= 6600000) return grossSalary * 0.2 + 440000;
        if (grossSalary <= 8500000) return grossSalary * 0.1 + 1100000;
        return 1950000;
    }

    calculateIncomeTax(taxableIncome) {
        let tax;
        if (taxableIncome <= 1950000) tax = taxableIncome * 0.05;
        else if (taxableIncome <= 3300000) tax = taxableIncome * 0.10 - 97500;
        else if (taxableIncome <= 6950000) tax = taxableIncome * 0.20 - 427500;
        else if (taxableIncome <= 9000000) tax = taxableIncome * 0.23 - 636000;
        else if (taxableIncome <= 18000000) tax = taxableIncome * 0.33 - 1536000;
        else if (taxableIncome <= 40000000) tax = taxableIncome * 0.40 - 2796000;
        else tax = taxableIncome * 0.45 - 4796000;
        return Math.round(tax * this.RATES.RECONSTRUCTION_SURTAX);
    }

    calculateResidentTax(taxableIncome, prefectureKey) {
        const prefData = this.prefectureData[prefectureKey];
        
        // 所得割：都道府県民税 + 市区町村民税
        const prefectureTax = taxableIncome * prefData.prefTaxRate;
        const cityTax = taxableIncome * prefData.cityTaxRate;
        const incomeBasedTax = prefectureTax + cityTax;
        
        // 均等割：固定額
        const flatRateTax = prefData.flatRate;
        
        // 合計（所得割 + 均等割）
        return Math.round(incomeBasedTax + flatRateTax);
    }

    calculateFurusatoLimit(taxableForIncomeTax, residentTaxIncomePortion) {
        if (residentTaxIncomePortion <= 0) return 0;
        let incomeTaxRate = 0;
        if (taxableForIncomeTax <= 1950000) incomeTaxRate = 0.05;
        else if (taxableForIncomeTax <= 3300000) incomeTaxRate = 0.10;
        else if (taxableForIncomeTax <= 6950000) incomeTaxRate = 0.20;
        else if (taxableForIncomeTax <= 9000000) incomeTaxRate = 0.23;
        else if (taxableForIncomeTax <= 18000000) incomeTaxRate = 0.33;
        else if (taxableForIncomeTax <= 40000000) incomeTaxRate = 0.40;
        else incomeTaxRate = 0.45;

        const denominator = 0.90 - (incomeTaxRate * this.RATES.RECONSTRUCTION_SURTAX);
        if (denominator <= 0) return 2000;
        const limit = (residentTaxIncomePortion * 0.20) / denominator + 2000;
        return Math.floor(limit / 1000) * 1000;
    }

    displayResults(data) {
        try {
            const totalDeductionsDisplay = data.socialInsurance.total + data.incomeTax + data.residentTax + data.companyHousingDeduction;

            // Safely update elements with null checks
            this.safeUpdateElement('netSalary', this.formatCurrency(data.netSalary));
            this.safeUpdateElement('monthlyNet', this.formatCurrency(data.netSalary / 12));
            this.safeUpdateElement('grossAmount', this.formatCurrency(data.originalGrossSalary));
            this.safeUpdateElement('totalDeductions', this.formatCurrency(totalDeductionsDisplay));
            this.safeUpdateElement('incomeTax', this.formatCurrency(data.incomeTax));
            this.safeUpdateElement('residentTax', this.formatCurrency(data.residentTax));
            this.safeUpdateElement('healthInsurance', this.formatCurrency(data.socialInsurance.health));
            this.safeUpdateElement('pensionInsurance', this.formatCurrency(data.socialInsurance.pension));
            this.safeUpdateElement('employmentInsurance', this.formatCurrency(data.socialInsurance.employment));
            
            // Bonus calculation approximation
            const prefectureKey = document.getElementById('prefecture')?.value || 'tokyo';
            const ageElement = document.getElementById('age');
            const age = ageElement ? parseInt(ageElement.value, 10) : 30;
            
            const bonusSocialInsurance = this.calculateSocialInsurance(0, data.bonus, age, data.employmentType, prefectureKey).total;
            const bonusNet = data.bonus > 0 ? data.bonus - bonusSocialInsurance - (data.incomeTax * (data.bonus / (data.originalGrossSalary - data.companyHousingDeduction))) : 0;

            this.safeUpdateElement('monthlyBase', this.formatCurrency((data.netSalary - bonusNet) / 12));
            this.safeUpdateElement('bonusNet', this.formatCurrency(bonusNet));
            this.safeUpdateElement('nextYearResidentTax', this.formatCurrency(data.nextYearResidentTax));

            // 副業所得の表示
            if (data.sideNetIncome > 0) {
                this.safeUpdateElement('sideIncomeAmount', this.formatCurrency(data.sideNetIncome));
                this.safeSetStyle('sideIncomeBreakdown', 'display', 'flex');
            } else {
                this.safeSetStyle('sideIncomeBreakdown', 'display', 'none');
            }

            // 各種節税額計算
            this.calculateTaxSavings(data);

            // 副業関連の智能建議
            this.displaySideIncomeAdvice(data);

            // AI個人化節税戦略
            this.generateAIRecommendations(data);

            // 計算過程の詳細を生成・表示
            this.generateCalculationProcess(data);

            // 社宅控除の表示
            if (data.companyHousingDeduction > 0) {
                const existingHousing = document.getElementById('companyHousingBreakdown');
                if (!existingHousing) {
                    const housingItem = document.createElement('div');
                    housingItem.className = 'breakdown-item';
                    housingItem.id = 'companyHousingBreakdown';
                    housingItem.innerHTML = `
                        <span class="breakdown-label">給与天引き家賃（年額）</span>
                        <span class="breakdown-value">${this.formatCurrency(data.companyHousingDeduction)}</span>
                    `;
                    const breakdownGrid = document.querySelector('.breakdown-grid');
                    if (breakdownGrid) {
                        breakdownGrid.appendChild(housingItem);
                    }
                } else {
                    const valueElement = existingHousing.querySelector('.breakdown-value');
                    if (valueElement) {
                        valueElement.textContent = this.formatCurrency(data.companyHousingDeduction);
                    }
                }
            }

            // 賞与がない場合は非表示
            if (data.bonus > 0) {
                this.safeSetStyle('bonusBreakdown', 'display', 'block');
            } else {
                this.safeSetStyle('bonusBreakdown', 'display', 'none');
            }

            // Show results section
            const resultsElement = document.getElementById('results');
            if (resultsElement) {
                resultsElement.classList.remove('hidden');
                // Removed auto-scroll to allow users to review input before viewing results
            }
            
        } catch (error) {
            console.error('Error displaying results:', error);
            this.showError('結果の表示中にエラーが発生しました');
        }
    }

    safeUpdateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        } else {
            console.warn(`Element with id '${id}' not found`);
        }
    }

    safeSetStyle(id, property, value) {
        const element = document.getElementById(id);
        if (element && element.style) {
            element.style[property] = value;
        } else {
            console.warn(`Element with id '${id}' not found or has no style property`);
        }
    }

    calculateTaxSavings(data) {
        try {
            // 現在の課税所得から所得税率を計算
            const ageElement = document.getElementById('age');
            const employmentTypeElement = document.getElementById('employmentType');
            const prefectureElement = document.getElementById('prefecture');
            
            if (!ageElement || !employmentTypeElement || !prefectureElement) {
                console.warn('Required form elements not found for tax savings calculation');
                return;
            }
            
            const age = parseInt(ageElement.value, 10);
            const employmentType = employmentTypeElement.value;
            const prefectureKey = prefectureElement.value;
            const grossSalary = data.originalGrossSalary - data.companyHousingDeduction;
            
            // 簡易的に課税所得を再計算（実際の計算と同じロジック）
            const salaryDeduction = this.calculateSalaryDeduction(grossSalary);
            const socialInsurance = this.calculateSocialInsurance(grossSalary / 12, data.bonus, age, employmentType, prefectureKey);
            const basicDeduction = 480000;
            const totalDeductions = socialInsurance.total + salaryDeduction + basicDeduction;
            const taxableIncome = Math.max(0, grossSalary - totalDeductions);
            
            // 所得税率を計算
            let incomeTaxRate = 0.05;
            if (taxableIncome > 1950000) incomeTaxRate = 0.10;
            if (taxableIncome > 3300000) incomeTaxRate = 0.20;
            if (taxableIncome > 6950000) incomeTaxRate = 0.23;
            if (taxableIncome > 9000000) incomeTaxRate = 0.33;
            if (taxableIncome > 18000000) incomeTaxRate = 0.40;
            if (taxableIncome > 40000000) incomeTaxRate = 0.45;
            
            // 復興特別所得税を含む
            incomeTaxRate = incomeTaxRate * this.RATES.RECONSTRUCTION_SURTAX;
            
            // 住民税率（地域別）
            const prefData = this.prefectureData[prefectureKey];
            const residentTaxRate = prefData.prefTaxRate + prefData.cityTaxRate;
            const totalTaxRate = incomeTaxRate + residentTaxRate;

            // 1. ふるさと納税の実質節税額は別途確認が必要
            this.safeUpdateElement('furusatoSavingsAmount', '別途計算要');

            // 2. iDeCoの節税額（年間最大拠出額：276,000円）
            const idecoMaxContribution = 276000; // 23,000円 × 12ヶ月
            const idecoSavings = idecoMaxContribution * totalTaxRate;
            this.safeUpdateElement('idecoSavingsAmount', this.formatCurrency(idecoSavings));

            // 3. つみたてNISAの節税額（年間40万円投資、5%利回りの利益に対する節税）
            const nisaMaxInvestment = 400000;
            const expectedReturn = 0.05;
            const nisaProfit = nisaMaxInvestment * expectedReturn;
            const nisaSavings = nisaProfit * totalTaxRate;
            this.safeUpdateElement('nisaSavingsAmount', this.formatCurrency(nisaSavings));

            // 4. 生命保険料控除の節税額（最大控除額：120,000円）
            const maxInsuranceDeduction = 120000;
            const insuranceSavings = maxInsuranceDeduction * totalTaxRate;
            this.safeUpdateElement('insuranceSavingsAmount', this.formatCurrency(insuranceSavings));
            
        } catch (error) {
            console.error('Error calculating tax savings:', error);
        }
    }

    displaySideIncomeAdvice(data) {
        try {
            const sideNetIncome = data.sideNetIncome || 0;
            const sideIncomeAdvice = document.getElementById('sideIncomeAdvice');
            
            if (!sideIncomeAdvice) {
                console.warn('Side income advice element not found');
                return;
            }
            
            if (sideNetIncome > 0) {
                this.safeSetStyle('sideIncomeAdvice', 'display', 'block');
                
                const adviceText = document.getElementById('sideIncomeAdviceText');
                const warningText = document.getElementById('sideIncomeWarningText');
                const warningLabel = document.querySelector('#sideIncomeWarning .savings-label');
                const warningElement = document.getElementById('sideIncomeWarning');
                
                if (sideNetIncome > 200000) {
                    // 20万円超：確定申告必要
                    if (adviceText) {
                        adviceText.textContent = `副業所得が${this.formatCurrency(sideNetIncome)}のため、確定申告が必要です。経費を適切に計上することで節税できます。`;
                    }
                    if (warningText) {
                        warningText.textContent = '確定申告必須（3月15日まで）';
                    }
                    if (warningLabel) {
                        warningLabel.textContent = '⚠️ 必須手続き：';
                    }
                    
                    // 警告色のスタイル設定
                    if (warningElement && warningElement.style) {
                        warningElement.style.borderLeftColor = '#e74c3c';
                        warningElement.style.background = 'linear-gradient(135deg, #ffeaea 0%, #ffe6e6 100%)';
                    }
                } else {
                    // 20万円以下：確定申告不要だが住民税申告は必要
                    if (adviceText) {
                        adviceText.textContent = `副業所得が${this.formatCurrency(sideNetIncome)}のため、確定申告は不要です。ただし住民税の申告は必要です。`;
                    }
                    if (warningText) {
                        warningText.textContent = '住民税申告が必要';
                    }
                    if (warningLabel) {
                        warningLabel.textContent = '💡 申告事項：';
                    }
                    
                    // 注意色のスタイル設定
                    if (warningElement && warningElement.style) {
                        warningElement.style.borderLeftColor = '#f39c12';
                        warningElement.style.background = 'linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)';
                    }
                }
                
                // 経費活用のアドバイス
                if (data.sideIncome > data.sideExpenses && adviceText) {
                    const potentialSavings = (data.sideIncome - data.sideExpenses) * 0.3; // 概算節税額
                    adviceText.textContent += ` 経費を増やすことで最大${this.formatCurrency(potentialSavings)}程度の節税が可能です。`;
                }
            } else {
                this.safeSetStyle('sideIncomeAdvice', 'display', 'none');
            }
        } catch (error) {
            console.error('Error displaying side income advice:', error);
        }
    }

    generateAIRecommendations(data) {
        try {
            const ageElement = document.getElementById('age');
            const employmentTypeElement = document.getElementById('employmentType');
            
            if (!ageElement || !employmentTypeElement) {
                console.warn('Required elements not found for AI recommendations');
                return;
            }
            
            const age = parseInt(ageElement.value, 10);
            const employmentType = employmentTypeElement.value;
            const grossSalary = data.originalGrossSalary;
            const sideNetIncome = data.sideNetIncome || 0;
            
            // ユーザープロフィール分析
            const userProfile = this.analyzeUserProfile(grossSalary, age, employmentType, sideNetIncome);
            
            // 個人化された推奨事項を生成
            const recommendations = this.generatePersonalizedRecommendations(data, userProfile);
            
            // AI建議区域を表示
            this.safeSetStyle('aiRecommendations', 'display', 'block');
            
            // プロフィール要約を表示
            this.safeUpdateElement('profileSummary', userProfile.summary);
            
            // 推奨事項を表示
            this.renderRecommendations(recommendations);
            
            // 戦略要約を生成
            this.generateStrategySummary(recommendations, userProfile);
            
            // プラン比較機能を初期化
            this.initializePlanComparison(recommendations, data);
        } catch (error) {
            console.error('Error generating AI recommendations:', error);
        }
    }

    analyzeUserProfile(grossSalary, age, employmentType, sideNetIncome) {
        let incomeLevel, ageGroup, profileSummary;
        
        // 収入レベル分析
        if (grossSalary < 3000000) {
            incomeLevel = 'low';
        } else if (grossSalary < 6000000) {
            incomeLevel = 'middle';
        } else if (grossSalary < 10000000) {
            incomeLevel = 'high';
        } else {
            incomeLevel = 'very_high';
        }
        
        // 年齢グループ分析
        if (age < 30) {
            ageGroup = 'young';
        } else if (age < 40) {
            ageGroup = 'middle_young';
        } else if (age < 50) {
            ageGroup = 'middle';
        } else {
            ageGroup = 'senior';
        }
        
        // 雇用形態の日本語表示
        const employmentTypeNames = {
            'seishain': '正社員',
            'keiyaku': '契約社員',
            'part': 'アルバイト・パート',
            'jieigyou': '自営業者',
            'freelance': 'フリーランス'
        };
        
        // プロフィール要約生成
        const incomeText = grossSalary >= 10000 ? `${Math.round(grossSalary/10000)}万円` : `${Math.round(grossSalary/1000)/10}万円`;
        profileSummary = `${age}歳 ${employmentTypeNames[employmentType]} 年収${incomeText}`;
        
        if (sideNetIncome > 0) {
            profileSummary += ` 副業所得${Math.round(sideNetIncome/10000)}万円`;
        }
        
        return {
            incomeLevel,
            ageGroup,
            employmentType,
            summary: profileSummary,
            grossSalary,
            age,
            sideNetIncome
        };
    }

    generatePersonalizedRecommendations(data, profile) {
        const recommendations = [];
        const totalTaxRate = this.calculateMarginalTaxRate(data);
        
        // 1. iDeCo推奨（年齢・雇用形態別）
        const idecoRec = this.generateIdecoRecommendation(profile, totalTaxRate);
        if (idecoRec) recommendations.push(idecoRec);
        
        // 2. ふるさと納税推奨
        const furusatoRec = this.generateFurusatoRecommendation(data, profile);
        if (furusatoRec) recommendations.push(furusatoRec);
        
        // 3. NISA推奨（年齢別）
        const nisaRec = this.generateNisaRecommendation(profile, totalTaxRate);
        if (nisaRec) recommendations.push(nisaRec);
        
        // 4. 生命保険推奨
        const insuranceRec = this.generateInsuranceRecommendation(profile, totalTaxRate);
        if (insuranceRec) recommendations.push(insuranceRec);
        
        // 5. 副業関連推奨
        if (profile.sideNetIncome > 0) {
            const sideJobRec = this.generateSideJobRecommendation(profile, totalTaxRate);
            if (sideJobRec) recommendations.push(sideJobRec);
        }
        
        // 6. 雇用形態別特殊推奨
        const specialRec = this.generateEmploymentSpecificRecommendation(profile, totalTaxRate);
        if (specialRec) recommendations.push(specialRec);
        
        // 優先度でソート
        return recommendations.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    calculateMarginalTaxRate(data) {
        // 簡易的な限界税率計算（所得税 + 住民税）
        const age = parseInt(document.getElementById('age').value, 10);
        const employmentType = document.getElementById('employmentType').value;
        const prefectureKey = document.getElementById('prefecture').value;
        const grossSalary = data.originalGrossSalary - data.companyHousingDeduction;
        
        const salaryDeduction = this.calculateSalaryDeduction(grossSalary);
        const socialInsurance = this.calculateSocialInsurance(grossSalary / 12, data.bonus, age, employmentType, prefectureKey);
        const taxableIncome = Math.max(0, grossSalary - salaryDeduction - socialInsurance.total - 480000);
        
        let incomeTaxRate = 0.05;
        if (taxableIncome > 1950000) incomeTaxRate = 0.10;
        if (taxableIncome > 3300000) incomeTaxRate = 0.20;
        if (taxableIncome > 6950000) incomeTaxRate = 0.23;
        if (taxableIncome > 9000000) incomeTaxRate = 0.33;
        if (taxableIncome > 18000000) incomeTaxRate = 0.40;
        if (taxableIncome > 40000000) incomeTaxRate = 0.45;
        
        // 地域別住民税率を使用
        const prefData = this.prefectureData[prefectureKey];
        const residentTaxRate = prefData.prefTaxRate + prefData.cityTaxRate;
        
        return (incomeTaxRate * 1.021) + residentTaxRate; // 復興特別所得税 + 住民税
    }

    generateIdecoRecommendation(profile, totalTaxRate) {
        if (profile.employmentType === 'jieigyou' || profile.employmentType === 'freelance') {
            const maxContribution = 816000; // 自営業者の上限
            const savingsAmount = maxContribution * totalTaxRate;
            return {
                title: '🏦 iDeCo（自営業者プラン）',
                description: `年間${this.formatCurrency(maxContribution)}まで拠出可能。老後資金を準備しながら大幅な節税効果があります。`,
                impact: savingsAmount,
                priority: 'high',
                category: 'retirement'
            };
        } else {
            const maxContribution = 276000; // 会社員の上限
            const savingsAmount = maxContribution * totalTaxRate;
            return {
                title: '🏦 iDeCo（企業年金なし）',
                description: `月額2.3万円まで拠出可能。全額所得控除で節税しながら老後資金を積立できます。`,
                impact: savingsAmount,
                priority: profile.ageGroup === 'young' ? 'high' : 'medium',
                category: 'retirement'
            };
        }
    }

    generateFurusatoRecommendation(data, profile) {
        const furusatoLimit = data.furusatoLimit;
        if (furusatoLimit > 2000) {
            const savingsAmount = furusatoLimit - 2000;
            return {
                title: '🎁 ふるさと納税',
                description: `${this.formatCurrency(furusatoLimit)}まで寄附可能。実質2,000円で返礼品を受け取れます。`,
                impact: savingsAmount,
                priority: profile.incomeLevel === 'low' ? 'medium' : 'high',
                category: 'tax_reduction'
            };
        }
        return null;
    }

    generateNisaRecommendation(profile, totalTaxRate) {
        if (profile.ageGroup === 'young' || profile.ageGroup === 'middle_young') {
            return {
                title: '📈 つみたてNISA',
                description: '年間40万円まで投資利益が非課税。長期投資で資産形成に最適です。',
                impact: 400000 * 0.05 * totalTaxRate, // 年利5%想定
                priority: 'medium',
                category: 'investment'
            };
        } else {
            return {
                title: '📈 一般NISA',
                description: '年間120万円まで投資利益が非課税。短期投資も可能です。',
                impact: 1200000 * 0.03 * totalTaxRate, // 年利3%想定
                priority: 'low',
                category: 'investment'
            };
        }
    }

    renderRecommendations(recommendations) {
        try {
            const grid = document.getElementById('recommendationGrid');
            if (!grid) {
                console.warn('Recommendation grid element not found');
                return;
            }
            
            grid.innerHTML = '';
            
            recommendations.slice(0, 6).forEach(rec => { // 最大6つ表示
                const item = document.createElement('div');
                item.className = `recommendation-item ${rec.priority}-priority`;
                
                const priorityIcon = rec.priority === 'high' ? '⭐' : rec.priority === 'medium' ? '🔥' : '💡';
                
                item.innerHTML = `
                    <div class="recommendation-title">
                        ${priorityIcon} ${rec.title}
                    </div>
                    <div class="recommendation-desc">
                        ${rec.description}
                    </div>
                    <div class="recommendation-impact">
                        <span>節税効果</span>
                        <span class="impact-amount">${this.formatCurrency(rec.impact)}</span>
                    </div>
                `;
                
                grid.appendChild(item);
            });
        } catch (error) {
            console.error('Error rendering recommendations:', error);
        }
    }

    generateStrategySummary(recommendations, profile) {
        try {
            const totalSavings = recommendations.reduce((sum, rec) => sum + rec.impact, 0);
            const highPriorityItems = recommendations.filter(rec => rec.priority === 'high').length;
            
            let strategyText = `分析結果：年間最大${this.formatCurrency(totalSavings)}の節税が可能です。`;
            
            if (highPriorityItems > 0) {
                strategyText += ` 特に優先度の高い${highPriorityItems}つの項目から始めることをお勧めします。`;
            }
            
            // 個人化されたアドバイス
            if (profile.ageGroup === 'young') {
                strategyText += ' 若い世代の方は長期投資（つみたてNISA、iDeCo）を重視し、将来の資産形成と節税を両立させましょう。';
            } else if (profile.incomeLevel === 'high') {
                strategyText += ' 高収入の方は複数の節税手法を組み合わせることで、効果的に税負担を軽減できます。';
            }
            
            if (profile.employmentType === 'jieigyou' || profile.employmentType === 'freelance') {
                strategyText += ' 自営業・フリーランスの方は経費の適切な計上も重要な節税手法です。';
            }
            
            this.safeUpdateElement('strategyText', strategyText);
        } catch (error) {
            console.error('Error generating strategy summary:', error);
        }
    }

    generateInsuranceRecommendation(profile, totalTaxRate) {
        const maxDeduction = 120000;
        const savingsAmount = maxDeduction * totalTaxRate;
        
        if (profile.ageGroup === 'young' || profile.ageGroup === 'middle_young') {
            return {
                title: '🛡️ 生命保険料控除',
                description: '年間12万円まで控除可能。若い方は掛け捨て型でリスクをカバーしながら節税できます。',
                impact: savingsAmount,
                priority: 'medium',
                category: 'insurance'
            };
        } else {
            return {
                title: '🛡️ 生命保険料控除',
                description: '年間12万円まで控除可能。貯蓄型保険で老後資金準備と節税を両立できます。',
                impact: savingsAmount,
                priority: 'low',
                category: 'insurance'
            };
        }
    }

    generateSideJobRecommendation(profile, totalTaxRate) {
        if (profile.sideNetIncome > 0) {
            const expenseOptimization = profile.sideNetIncome * 0.2; // 経費20%想定
            const potentialSavings = expenseOptimization * totalTaxRate;
            
            return {
                title: '💼 副業経費最適化',
                description: `副業関連の経費を適切に計上することで節税効果があります。通信費、書籍代、セミナー費用などを見直しましょう。`,
                impact: potentialSavings,
                priority: profile.sideNetIncome > 200000 ? 'high' : 'medium',
                category: 'side_job'
            };
        }
        return null;
    }

    generateEmploymentSpecificRecommendation(profile, totalTaxRate) {
        if (profile.employmentType === 'jieigyou' || profile.employmentType === 'freelance') {
            return {
                title: '📊 小規模企業共済',
                description: '年間84万円まで拠出可能。退職金代わりになり、全額所得控除で大きな節税効果があります。',
                impact: 840000 * totalTaxRate,
                priority: 'high',
                category: 'self_employed'
            };
        } else if (profile.employmentType === 'part' && profile.grossSalary < 1300000) {
            return {
                title: '💡 扶養内調整',
                description: '年収130万円以内で社会保険料負担を避けられています。収入増加時は扶養範囲の見直しを検討しましょう。',
                impact: 200000, // 概算の社会保険料
                priority: 'medium',
                category: 'part_time'
            };
        }
        return null;
    }

    formatCurrency(amount) {
        return '¥' + Math.round(amount).toLocaleString('ja-JP');
    }

    // Plan Comparison Methods
    initializePlanComparison(recommendations, data) {
        if (recommendations.length < 2) return; // Need at least 2 recommendations for comparison
        
        document.getElementById('planComparison').style.display = 'block';
        this.currentRecommendations = recommendations;
        this.currentData = data;
        this.selectedPlans = [];
        
        this.createPlanOptions(recommendations);
    }

    createPlanOptions(recommendations) {
        const planOptions = document.getElementById('planOptions');
        planOptions.innerHTML = '';
        
        recommendations.forEach((rec, index) => {
            const option = document.createElement('div');
            option.className = 'plan-option';
            option.dataset.planId = index;
            option.onclick = () => this.handlePlanSelection(index);
            
            option.innerHTML = `
                <div class="plan-option-title">${rec.title}</div>
                <div class="plan-option-impact">年間節税: ${this.formatCurrency(rec.impact)}</div>
            `;
            
            planOptions.appendChild(option);
        });
    }

    handlePlanSelection(planId) {
        const option = document.querySelector(`[data-plan-id="${planId}"]`);
        const isSelected = option.classList.contains('selected');
        
        if (isSelected) {
            option.classList.remove('selected');
            this.selectedPlans = this.selectedPlans.filter(id => id !== planId);
        } else {
            option.classList.add('selected');
            this.selectedPlans.push(planId);
        }
        
        if (this.selectedPlans.length >= 2) {
            this.generateComparisonTable();
        } else {
            document.getElementById('comparisonTable').innerHTML = 
                '<p style="color: rgba(255,255,255,0.8); text-align: center; padding: 20px;">2つ以上のプランを選択してください</p>';
            document.getElementById('comparisonSummary').innerHTML = '';
        }
    }

    generateComparisonTable() {
        const selectedRecommendations = this.selectedPlans.map(id => this.currentRecommendations[id]);
        const combinations = this.generateCombinations(selectedRecommendations);
        
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>項目</th>
                        <th>個別実施</th>
                        ${combinations.map((combo, index) => 
                            `<th class="plan-column">組合せ${index + 1}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
        `;
        
        // 実施項目の行
        tableHTML += `
            <tr>
                <td><strong>実施項目</strong></td>
                <td>各項目単独</td>
                ${combinations.map(combo => 
                    `<td>${combo.map(rec => rec.title.replace(/[🎁🏦📈🛡️💼📊💡]/g, '')).join('<br>')}</td>`
                ).join('')}
            </tr>
        `;
        
        // 節税効果の行
        tableHTML += `
            <tr>
                <td><strong>年間節税効果</strong></td>
                <td>${selectedRecommendations.map(rec => this.formatCurrency(rec.impact)).join('<br>')}</td>
                ${combinations.map(combo => {
                    const combinedSavings = this.calculateCombinedSavings(combo);
                    return `<td class="impact-cell">${this.formatCurrency(combinedSavings)}</td>`;
                }).join('')}
            </tr>
        `;
        
        // 実施難易度の行
        tableHTML += `
            <tr>
                <td><strong>実施難易度</strong></td>
                <td>${selectedRecommendations.map(rec => this.getDifficultyText(rec)).join('<br>')}</td>
                ${combinations.map(combo => 
                    `<td>${this.getCombinationDifficulty(combo)}</td>`
                ).join('')}
            </tr>
        `;
        
        // 開始時期の行
        tableHTML += `
            <tr>
                <td><strong>推奨開始時期</strong></td>
                <td>${selectedRecommendations.map(rec => this.getStartTiming(rec)).join('<br>')}</td>
                ${combinations.map(combo => 
                    `<td>${this.getCombinationTiming(combo)}</td>`
                ).join('')}
            </tr>
        `;
        
        tableHTML += '</tbody></table>';
        
        document.getElementById('comparisonTable').innerHTML = tableHTML;
        this.generateComparisonSummary(combinations);
    }

    generateCombinations(recommendations) {
        const combinations = [];
        
        // 2つの組み合わせ
        for (let i = 0; i < recommendations.length; i++) {
            for (let j = i + 1; j < recommendations.length; j++) {
                combinations.push([recommendations[i], recommendations[j]]);
            }
        }
        
        // 3つ以上の場合の組み合わせ（最大4つまで）
        if (recommendations.length >= 3) {
            for (let i = 0; i < recommendations.length; i++) {
                for (let j = i + 1; j < recommendations.length; j++) {
                    for (let k = j + 1; k < recommendations.length; k++) {
                        combinations.push([recommendations[i], recommendations[j], recommendations[k]]);
                        if (recommendations.length >= 4 && k + 1 < recommendations.length) {
                            for (let l = k + 1; l < recommendations.length; l++) {
                                combinations.push([recommendations[i], recommendations[j], recommendations[k], recommendations[l]]);
                            }
                        }
                    }
                }
            }
        }
        
        return combinations.slice(0, 5); // 最大5つの組み合わせまで表示
    }

    calculateCombinedSavings(combination) {
        // 基本的には単純合計（実際にはシナジー効果や制約を考慮すべき）
        let totalSavings = combination.reduce((sum, rec) => sum + rec.impact, 0);
        
        // 一部制約の考慮（例：iDeCoとNISAの合計投資額制約など）
        const hasIdeco = combination.some(rec => rec.category === 'retirement');
        const hasNisa = combination.some(rec => rec.category === 'investment');
        
        if (hasIdeco && hasNisa) {
            // 投資余力制約で10%減額
            totalSavings *= 0.9;
        }
        
        return totalSavings;
    }

    getDifficultyText(recommendation) {
        switch (recommendation.priority) {
            case 'high': return '簡単';
            case 'medium': return '普通';
            case 'low': return 'やや難';
            default: return '普通';
        }
    }

    getCombinationDifficulty(combination) {
        const avgDifficulty = combination.length > 2 ? 'やや難' : '普通';
        return avgDifficulty;
    }

    getStartTiming(recommendation) {
        if (recommendation.category === 'tax_reduction') return '即時';
        if (recommendation.category === 'retirement') return '3ヶ月以内';
        if (recommendation.category === 'investment') return '1ヶ月以内';
        return '適宜';
    }

    getCombinationTiming(combination) {
        const hasImmediate = combination.some(rec => rec.category === 'tax_reduction');
        return hasImmediate ? '即時開始可能' : '段階的実施';
    }

    generateComparisonSummary(combinations) {
        const bestCombination = combinations.reduce((best, current) => {
            const bestSavings = this.calculateCombinedSavings(best);
            const currentSavings = this.calculateCombinedSavings(current);
            return currentSavings > bestSavings ? current : best;
        });
        
        const maxSavings = this.calculateCombinedSavings(bestCombination);
        const totalPlans = combinations.length;
        const avgSavings = combinations.reduce((sum, combo) => 
            sum + this.calculateCombinedSavings(combo), 0) / totalPlans;
        
        const summaryHTML = `
            <h5>📊 比較分析結果</h5>
            <div class="summary-stats">
                <div class="summary-stat">
                    <div class="summary-stat-label">最大節税効果</div>
                    <div class="summary-stat-value">${this.formatCurrency(maxSavings)}</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">平均節税効果</div>
                    <div class="summary-stat-value">${this.formatCurrency(avgSavings)}</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-label">比較プラン数</div>
                    <div class="summary-stat-value">${totalPlans}プラン</div>
                </div>
            </div>
            <div class="best-combination">
                <div class="best-combination-text">
                    <strong>🏆 推奨プラン:</strong> 
                    ${bestCombination.map(rec => rec.title.replace(/[🎁🏦📈🛡️💼📊💡]/g, '')).join(' + ')}
                    <br>
                    このプランで年間<strong>${this.formatCurrency(maxSavings)}</strong>の節税効果が期待できます。
                </div>
            </div>
        `;
        
        document.getElementById('comparisonSummary').innerHTML = summaryHTML;
    }

    // Calculation Process Transparency Methods
    generateCalculationProcess(data) {
        // Show the calculation process section
        document.getElementById('calculationProcess').style.display = 'block';
        
        // Get current form values for calculations
        const age = parseInt(document.getElementById('age').value, 10);
        const employmentType = document.getElementById('employmentType').value;
        const prefectureKey = document.getElementById('prefecture').value;
        const grossSalary = data.originalGrossSalary - data.companyHousingDeduction;
        
        // Generate detailed explanations for each tab
        this.generateIncomeTaxProcess(data, grossSalary, age, employmentType, prefectureKey);
        this.generateResidentTaxProcess(data, grossSalary, age, employmentType, prefectureKey);
        this.generateSocialInsuranceProcess(data, grossSalary, age, employmentType, prefectureKey);
        this.generateDeductionsProcess(data, grossSalary);
    }

    generateIncomeTaxProcess(data, grossSalary, age, employmentType, prefectureKey) {
        const salaryDeduction = this.calculateSalaryDeduction(grossSalary);
        const socialInsurance = this.calculateSocialInsurance(grossSalary / 12, data.bonus, age, employmentType, prefectureKey);
        const basicDeduction = 480000;
        const totalIncome = grossSalary + (data.sideNetIncome || 0);
        const totalDeductions = socialInsurance.total + salaryDeduction + basicDeduction;
        const taxableIncome = Math.max(0, totalIncome - totalDeductions);
        
        const content = `
            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">1</span>
                    総所得金額の計算
                </div>
                <div class="step-explanation">
                    給与所得と副業所得を合算して総所得金額を算出します。
                </div>
                <div class="step-formula">
                    総所得金額 = <span class="formula-variable">給与所得</span> + <span class="formula-variable">副業所得</span><br>
                    = ${this.formatCurrency(grossSalary)} + ${this.formatCurrency(data.sideNetIncome || 0)}<br>
                    = ${this.formatCurrency(totalIncome)}
                </div>
                <div class="step-result">
                    <span class="step-result-label">総所得金額</span>
                    <span class="step-result-value">${this.formatCurrency(totalIncome)}</span>
                </div>
            </div>

            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">2</span>
                    給与所得控除の計算
                </div>
                <div class="step-explanation">
                    給与収入に応じて給与所得控除額を算出します。2024年度の給与所得控除表を使用。
                </div>
                <div class="step-formula">
                    給与所得控除 = ${this.getSalaryDeductionFormula(grossSalary)}
                </div>
                <div class="rate-source">
                    <div class="rate-source-title">控除額の根拠</div>
                    年収${this.formatCurrency(grossSalary)}の場合の給与所得控除額（2024年度）
                </div>
                <div class="step-result">
                    <span class="step-result-label">給与所得控除額</span>
                    <span class="step-result-value">${this.formatCurrency(salaryDeduction)}</span>
                </div>
            </div>

            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">3</span>
                    課税所得金額の計算
                </div>
                <div class="step-explanation">
                    総所得金額から各種控除を差し引いて課税所得金額を算出します。
                </div>
                <div class="step-formula">
                    課税所得 = <span class="formula-variable">総所得</span> - <span class="formula-variable">給与所得控除</span> - <span class="formula-variable">社会保険料控除</span> - <span class="formula-variable">基礎控除</span><br>
                    = ${this.formatCurrency(totalIncome)} - ${this.formatCurrency(salaryDeduction)} - ${this.formatCurrency(socialInsurance.total)} - ${this.formatCurrency(basicDeduction)}<br>
                    = ${this.formatCurrency(taxableIncome)}
                </div>
                <div class="step-result">
                    <span class="step-result-label">課税所得金額</span>
                    <span class="step-result-value">${this.formatCurrency(taxableIncome)}</span>
                </div>
            </div>

            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">4</span>
                    所得税額の計算
                </div>
                <div class="step-explanation">
                    課税所得金額に応じた税率を適用し、復興特別所得税を含めて所得税額を計算します。
                </div>
                <div class="step-formula">
                    所得税 = ${this.getIncomeTaxFormula(taxableIncome)} × <span class="formula-variable">復興特別所得税率（102.1%）</span><br>
                    = ${this.formatCurrency(data.incomeTax / 1.021)} × 1.021<br>
                    = ${this.formatCurrency(data.incomeTax)}
                </div>
                <div class="rate-source">
                    <div class="rate-source-title">税率の根拠</div>
                    ${this.getIncomeTaxRateExplanation(taxableIncome)}
                </div>
                <div class="step-result">
                    <span class="step-result-label">年間所得税額（復興特別所得税含む）</span>
                    <span class="step-result-value">${this.formatCurrency(data.incomeTax)}</span>
                </div>
            </div>
        `;
        
        document.getElementById('incomeTab').innerHTML = content;
    }

    generateResidentTaxProcess(data, grossSalary, age, employmentType, prefectureKey) {
        const prefData = this.prefectureData[prefectureKey];
        const lastYearSalary = this.parseManEnNumber(document.getElementById('lastYearSalary').value) || grossSalary;
        const lastYearSocialInsurance = this.calculateSocialInsurance(lastYearSalary / 12, 0, age, employmentType, prefectureKey);
        const lastYearSalaryDeduction = this.calculateSalaryDeduction(lastYearSalary);
        const lastYearTaxableIncome = Math.max(0, lastYearSalary - lastYearSalaryDeduction - lastYearSocialInsurance.total - 430000);
        
        const prefectureTax = lastYearTaxableIncome * prefData.prefTaxRate;
        const cityTax = lastYearTaxableIncome * prefData.cityTaxRate;
        
        const content = `
            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">1</span>
                    前年の課税所得金額（住民税ベース）
                </div>
                <div class="step-explanation">
                    住民税は前年所得ベースで計算されます。基礎控除は所得税より少ない43万円です。
                </div>
                <div class="step-formula">
                    前年課税所得 = <span class="formula-variable">前年総所得</span> - <span class="formula-variable">給与所得控除</span> - <span class="formula-variable">社会保険料控除</span> - <span class="formula-variable">基礎控除（43万円）</span><br>
                    = ${this.formatCurrency(lastYearSalary)} - ${this.formatCurrency(lastYearSalaryDeduction)} - ${this.formatCurrency(lastYearSocialInsurance.total)} - ¥430,000<br>
                    = ${this.formatCurrency(lastYearTaxableIncome)}
                </div>
                <div class="step-result">
                    <span class="step-result-label">前年課税所得金額</span>
                    <span class="step-result-value">${this.formatCurrency(lastYearTaxableIncome)}</span>
                </div>
            </div>

            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">2</span>
                    都道府県民税（所得割）の計算
                </div>
                <div class="step-explanation">
                    ${prefData.name}の都道府県民税率は${(prefData.prefTaxRate * 100).toFixed(1)}%です。
                </div>
                <div class="step-formula">
                    都道府県民税（所得割） = <span class="formula-variable">課税所得</span> × <span class="formula-variable">${(prefData.prefTaxRate * 100).toFixed(1)}%</span><br>
                    = ${this.formatCurrency(lastYearTaxableIncome)} × ${(prefData.prefTaxRate * 100).toFixed(1)}%<br>
                    = ${this.formatCurrency(prefectureTax)}
                </div>
                <div class="rate-source">
                    <div class="rate-source-title">税率の根拠</div>
                    ${prefData.name}の都道府県民税率（標準税率${prefData.prefTaxRate === 0.045 ? '+超過課税' : ''}）
                </div>
                <div class="step-result">
                    <span class="step-result-label">都道府県民税（所得割）</span>
                    <span class="step-result-value">${this.formatCurrency(prefectureTax)}</span>
                </div>
            </div>

            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">3</span>
                    市区町村民税（所得割）の計算
                </div>
                <div class="step-explanation">
                    市区町村民税率は全国一律6%です。
                </div>
                <div class="step-formula">
                    市区町村民税（所得割） = <span class="formula-variable">課税所得</span> × <span class="formula-variable">6%</span><br>
                    = ${this.formatCurrency(lastYearTaxableIncome)} × 6%<br>
                    = ${this.formatCurrency(cityTax)}
                </div>
                <div class="step-result">
                    <span class="step-result-label">市区町村民税（所得割）</span>
                    <span class="step-result-value">${this.formatCurrency(cityTax)}</span>
                </div>
            </div>

            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">4</span>
                    均等割の加算
                </div>
                <div class="step-explanation">
                    所得に関係なく定額で課税される均等割を加算します。
                </div>
                <div class="step-formula">
                    住民税合計 = <span class="formula-variable">都道府県民税</span> + <span class="formula-variable">市区町村民税</span> + <span class="formula-variable">均等割</span><br>
                    = ${this.formatCurrency(prefectureTax)} + ${this.formatCurrency(cityTax)} + ${this.formatCurrency(prefData.flatRate)}<br>
                    = ${this.formatCurrency(data.residentTax)}
                </div>
                <div class="rate-source">
                    <div class="rate-source-title">均等割の根拠</div>
                    ${prefData.name}の均等割額（都道府県分+市区町村分）
                </div>
                <div class="step-result">
                    <span class="step-result-label">年間住民税額</span>
                    <span class="step-result-value">${this.formatCurrency(data.residentTax)}</span>
                </div>
            </div>
        `;
        
        document.getElementById('residentTab').innerHTML = content;
    }

    generateSocialInsuranceProcess(data, grossSalary, age, employmentType, prefectureKey) {
        const prefData = this.prefectureData[prefectureKey];
        const monthlySalary = grossSalary / 12;
        
        let content = '';
        
        if (employmentType === 'jieigyou' || employmentType === 'freelance') {
            // 自営業者・フリーランスの場合
            const kokuhoIncome = Math.max(0, grossSalary - 430000);
            const healthIns = kokuhoIncome * prefData.kokuhoRate + 45000;
            const pensionIns = 196800;
            
            content = `
                <div class="calculation-step">
                    <div class="step-title">
                        <span class="step-number">1</span>
                        国民健康保険料の計算
                    </div>
                    <div class="step-explanation">
                        自営業者・フリーランスは国民健康保険に加入します。所得割+均等割で計算されます。
                    </div>
                    <div class="step-formula">
                        国民健康保険料 = <span class="formula-variable">（総所得-基礎控除）</span> × <span class="formula-variable">${(prefData.kokuhoRate * 100).toFixed(1)}%</span> + <span class="formula-variable">均等割</span><br>
                        = (${this.formatCurrency(grossSalary)} - ¥430,000) × ${(prefData.kokuhoRate * 100).toFixed(1)}% + ¥45,000<br>
                        = ${this.formatCurrency(healthIns)}
                    </div>
                    <div class="rate-source">
                        <div class="rate-source-title">料率の根拠</div>
                        ${prefData.name}の国民健康保険料率（概算）
                    </div>
                    <div class="step-result">
                        <span class="step-result-label">年間国民健康保険料</span>
                        <span class="step-result-value">${this.formatCurrency(data.socialInsurance.health)}</span>
                    </div>
                </div>

                <div class="calculation-step">
                    <div class="step-title">
                        <span class="step-number">2</span>
                        国民年金保険料の計算
                    </div>
                    <div class="step-explanation">
                        国民年金保険料は定額制です（2024年度：月額16,400円）。
                    </div>
                    <div class="step-formula">
                        国民年金保険料 = <span class="formula-variable">月額16,400円</span> × <span class="formula-variable">12ヶ月</span><br>
                        = ¥16,400 × 12 = ${this.formatCurrency(pensionIns)}
                    </div>
                    <div class="step-result">
                        <span class="step-result-label">年間国民年金保険料</span>
                        <span class="step-result-value">${this.formatCurrency(data.socialInsurance.pension)}</span>
                    </div>
                </div>
            `;
        } else {
            // 会社員の場合
            const smrHealth = Math.min(monthlySalary, 650000);
            const smrPension = Math.min(monthlySalary, 650000);
            const healthRate = prefData.healthInsuranceRate + (age >= 40 ? prefData.careInsuranceRate : 0);
            
            content = `
                <div class="calculation-step">
                    <div class="step-title">
                        <span class="step-number">1</span>
                        健康保険料の計算
                    </div>
                    <div class="step-explanation">
                        健康保険料は標準報酬月額をベースに計算されます。${age >= 40 ? '40歳以上のため介護保険料も含まれます。' : ''}
                    </div>
                    <div class="step-formula">
                        標準報酬月額 = ${this.formatCurrency(smrHealth)} （上限：65万円）<br>
                        健康保険料率 = ${(prefData.healthInsuranceRate * 100).toFixed(2)}%${age >= 40 ? ' + 介護保険料率' + (prefData.careInsuranceRate * 100).toFixed(2) + '%' : ''}<br>
                        = ${(healthRate * 100).toFixed(2)}%（労使折半のため実負担は半額）<br><br>
                        年間健康保険料 = <span class="formula-variable">（月額保険料 × 12 + 賞与保険料）</span> ÷ 2<br>
                        = ${this.formatCurrency(data.socialInsurance.health)}
                    </div>
                    <div class="rate-source">
                        <div class="rate-source-title">料率の根拠</div>
                        ${prefData.name}の協会けんぽ健康保険料率（2024年度）
                    </div>
                    <div class="step-result">
                        <span class="step-result-label">年間健康保険料（本人負担分）</span>
                        <span class="step-result-value">${this.formatCurrency(data.socialInsurance.health)}</span>
                    </div>
                </div>

                <div class="calculation-step">
                    <div class="step-title">
                        <span class="step-number">2</span>
                        厚生年金保険料の計算
                    </div>
                    <div class="step-explanation">
                        厚生年金保険料は全国一律18.3%の料率で計算されます。
                    </div>
                    <div class="step-formula">
                        標準報酬月額 = ${this.formatCurrency(smrPension)} （上限：65万円）<br>
                        厚生年金保険料率 = 18.3%（労使折半のため実負担は9.15%）<br><br>
                        年間厚生年金保険料 = <span class="formula-variable">（月額保険料 × 12 + 賞与保険料）</span> ÷ 2<br>
                        = ${this.formatCurrency(data.socialInsurance.pension)}
                    </div>
                    <div class="step-result">
                        <span class="step-result-label">年間厚生年金保険料（本人負担分）</span>
                        <span class="step-result-value">${this.formatCurrency(data.socialInsurance.pension)}</span>
                    </div>
                </div>

                <div class="calculation-step">
                    <div class="step-title">
                        <span class="step-number">3</span>
                        雇用保険料の計算
                    </div>
                    <div class="step-explanation">
                        雇用保険料は年収全体に対して料率を適用します。
                    </div>
                    <div class="step-formula">
                        雇用保険料 = <span class="formula-variable">年収</span> × <span class="formula-variable">0.6%</span><br>
                        = ${this.formatCurrency(grossSalary)} × 0.6%<br>
                        = ${this.formatCurrency(data.socialInsurance.employment)}
                    </div>
                    <div class="step-result">
                        <span class="step-result-label">年間雇用保険料</span>
                        <span class="step-result-value">${this.formatCurrency(data.socialInsurance.employment)}</span>
                    </div>
                </div>
            `;
        }
        
        content += `
            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">${employmentType === 'jieigyou' || employmentType === 'freelance' ? '3' : '4'}</span>
                    社会保険料合計
                </div>
                <div class="step-formula">
                    社会保険料合計 = ${this.formatCurrency(data.socialInsurance.health)} + ${this.formatCurrency(data.socialInsurance.pension)} + ${this.formatCurrency(data.socialInsurance.employment)}<br>
                    = ${this.formatCurrency(data.socialInsurance.total)}
                </div>
                <div class="step-result">
                    <span class="step-result-label">年間社会保険料合計</span>
                    <span class="step-result-value">${this.formatCurrency(data.socialInsurance.total)}</span>
                </div>
            </div>
        `;
        
        document.getElementById('socialTab').innerHTML = content;
    }

    generateDeductionsProcess(data, grossSalary) {
        const salaryDeduction = this.calculateSalaryDeduction(grossSalary);
        const basicDeduction = 480000;
        const spouseDeduction = document.getElementById('hasSpouse').value === 'yes' ? 380000 : 0;
        const dependents = parseInt(document.getElementById('dependents').value, 10) || 0;
        const dependentDeduction = dependents * 380000;
        const medicalExpenses = this.parseManEnNumber(document.getElementById('medicalExpenses').value);
        const medicalDeduction = Math.max(0, medicalExpenses - 100000);
        const lifeInsurance = this.parseManEnNumber(document.getElementById('lifeInsurance').value);
        const lifeInsuranceDeduction = Math.min(lifeInsurance, 120000);
        
        const content = `
            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">1</span>
                    各種控除の詳細
                </div>
                <div class="step-explanation">
                    所得税計算で適用される各種控除の内訳と計算根拠を説明します。
                </div>
                <div class="deduction-breakdown">
                    <div class="deduction-item">
                        <div class="deduction-item-title">給与所得控除</div>
                        <div class="deduction-item-amount">${this.formatCurrency(salaryDeduction)}</div>
                        <div class="step-explanation">年収に応じた自動控除</div>
                    </div>
                    <div class="deduction-item">
                        <div class="deduction-item-title">社会保険料控除</div>
                        <div class="deduction-item-amount">${this.formatCurrency(data.socialInsurance.total)}</div>
                        <div class="step-explanation">支払った社会保険料の全額</div>
                    </div>
                    <div class="deduction-item">
                        <div class="deduction-item-title">基礎控除</div>
                        <div class="deduction-item-amount">${this.formatCurrency(basicDeduction)}</div>
                        <div class="step-explanation">誰でも適用される基本控除</div>
                    </div>
                    ${spouseDeduction > 0 ? `
                    <div class="deduction-item">
                        <div class="deduction-item-title">配偶者控除</div>
                        <div class="deduction-item-amount">${this.formatCurrency(spouseDeduction)}</div>
                        <div class="step-explanation">配偶者がいる場合の控除</div>
                    </div>
                    ` : ''}
                    ${dependentDeduction > 0 ? `
                    <div class="deduction-item">
                        <div class="deduction-item-title">扶養控除</div>
                        <div class="deduction-item-amount">${this.formatCurrency(dependentDeduction)}</div>
                        <div class="step-explanation">${dependents}名 × 38万円</div>
                    </div>
                    ` : ''}
                    ${medicalDeduction > 0 ? `
                    <div class="deduction-item">
                        <div class="deduction-item-title">医療費控除</div>
                        <div class="deduction-item-amount">${this.formatCurrency(medicalDeduction)}</div>
                        <div class="step-explanation">医療費 - 10万円</div>
                    </div>
                    ` : ''}
                    ${lifeInsuranceDeduction > 0 ? `
                    <div class="deduction-item">
                        <div class="deduction-item-title">生命保険料控除</div>
                        <div class="deduction-item-amount">${this.formatCurrency(lifeInsuranceDeduction)}</div>
                        <div class="step-explanation">最大12万円まで</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="calculation-step">
                <div class="step-title">
                    <span class="step-number">2</span>
                    控除合計額
                </div>
                <div class="step-explanation">
                    すべての控除を合計して、課税所得金額の算出に使用します。
                </div>
                <div class="step-formula">
                    控除合計 = ${this.formatCurrency(salaryDeduction)} + ${this.formatCurrency(data.socialInsurance.total)} + ${this.formatCurrency(basicDeduction)}${spouseDeduction > 0 ? ' + ' + this.formatCurrency(spouseDeduction) : ''}${dependentDeduction > 0 ? ' + ' + this.formatCurrency(dependentDeduction) : ''}${medicalDeduction > 0 ? ' + ' + this.formatCurrency(medicalDeduction) : ''}${lifeInsuranceDeduction > 0 ? ' + ' + this.formatCurrency(lifeInsuranceDeduction) : ''}<br>
                    = ${this.formatCurrency(salaryDeduction + data.socialInsurance.total + basicDeduction + spouseDeduction + dependentDeduction + medicalDeduction + lifeInsuranceDeduction)}
                </div>
                <div class="step-result">
                    <span class="step-result-label">控除合計額</span>
                    <span class="step-result-value">${this.formatCurrency(salaryDeduction + data.socialInsurance.total + basicDeduction + spouseDeduction + dependentDeduction + medicalDeduction + lifeInsuranceDeduction)}</span>
                </div>
            </div>
        `;
        
        document.getElementById('deductionsTab').innerHTML = content;
    }

    getSalaryDeductionFormula(grossSalary) {
        if (grossSalary <= 1625000) return '55万円（最低控除額）';
        if (grossSalary <= 1800000) return `${this.formatCurrency(grossSalary)} × 40% - 10万円`;
        if (grossSalary <= 3600000) return `${this.formatCurrency(grossSalary)} × 30% + 8万円`;
        if (grossSalary <= 6600000) return `${this.formatCurrency(grossSalary)} × 20% + 44万円`;
        if (grossSalary <= 8500000) return `${this.formatCurrency(grossSalary)} × 10% + 110万円`;
        return '195万円（最高控除額）';
    }

    getIncomeTaxFormula(taxableIncome) {
        if (taxableIncome <= 1950000) return `${this.formatCurrency(taxableIncome)} × 5%`;
        if (taxableIncome <= 3300000) return `${this.formatCurrency(taxableIncome)} × 10% - 97,500円`;
        if (taxableIncome <= 6950000) return `${this.formatCurrency(taxableIncome)} × 20% - 427,500円`;
        if (taxableIncome <= 9000000) return `${this.formatCurrency(taxableIncome)} × 23% - 636,000円`;
        if (taxableIncome <= 18000000) return `${this.formatCurrency(taxableIncome)} × 33% - 1,536,000円`;
        if (taxableIncome <= 40000000) return `${this.formatCurrency(taxableIncome)} × 40% - 2,796,000円`;
        return `${this.formatCurrency(taxableIncome)} × 45% - 4,796,000円`;
    }

    getIncomeTaxRateExplanation(taxableIncome) {
        if (taxableIncome <= 1950000) return '課税所得195万円以下：税率5%';
        if (taxableIncome <= 3300000) return '課税所得195万円超330万円以下：税率10%';
        if (taxableIncome <= 6950000) return '課税所得330万円超695万円以下：税率20%';
        if (taxableIncome <= 9000000) return '課税所得695万円超900万円以下：税率23%';
        if (taxableIncome <= 18000000) return '課税所得900万円超1800万円以下：税率33%';
        if (taxableIncome <= 40000000) return '課税所得1800万円超4000万円以下：税率40%';
        return '課税所得4000万円超：税率45%';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new JapanSalaryCalculator();
});