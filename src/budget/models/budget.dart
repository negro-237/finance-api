class BudgetModel {
  final int id;
  final int categoryId;
  final String categoryName;
  final String? categoryIcon;
  final String? categoryColor;

  final double budget;
  final double spent;
  final double remaining;
  final double percentage;

  final String status;

  final int month;
  final int year;

  const BudgetModel({
    required this.id,
    required this.categoryId,
    required this.categoryName,
    this.categoryIcon,
    this.categoryColor,
    required this.budget,
    required this.spent,
    required this.remaining,
    required this.percentage,
    required this.status,
    required this.month,
    required this.year,
  });

  factory BudgetModel.fromJson(
    Map<String, dynamic> json,
  ) {
    final category =
        json['category'] as Map<String, dynamic>?;

    return BudgetModel(
      id: (json['id'] as num).toInt(),

      categoryId:
          (json['categoryId'] as num?)?.toInt() ??
              (category?['id'] as num?)?.toInt() ??
              0,

      categoryName:
          category?['name']?.toString() ??
              json['categoryName']?.toString() ??
              'Catégorie',

      categoryIcon:
          category?['icon']?.toString() ??
              json['icon']?.toString(),

      categoryColor:
          category?['color']?.toString() ??
              json['color']?.toString(),

      budget:
          double.tryParse(
                json['budget']?.toString() ??
                    json['amount']?.toString() ??
                    '0',
              ) ??
              0,

      spent:
          double.tryParse(
                json['spent']?.toString() ?? '0',
              ) ??
              0,

      remaining:
          double.tryParse(
                json['remaining']?.toString() ?? '0',
              ) ??
              0,

      percentage:
          double.tryParse(
                json['percentage']?.toString() ?? '0',
              ) ??
              0,

      status:
          json['status']?.toString() ??
              'ON_TRACK',

      month:
          (json['month'] as num?)?.toInt() ??
              DateTime.now().month,

      year:
          (json['year'] as num?)?.toInt() ??
              DateTime.now().year,
    );
  }

  bool get isExceeded {
    return status == 'EXCEEDED';
  }

  bool get isWarning {
    return status == 'WARNING';
  }

  bool get isOnTrack {
    return status == 'ON_TRACK';
  }

  String get statusLabel {
    switch (status) {
      case 'EXCEEDED':
        return 'Dépassé';

      case 'WARNING':
        return 'Attention';

      case 'ON_TRACK':
        return 'Dans les limites';

      default:
        return status;
    }
  }

  String get formattedBudget {
    return '${budget.toStringAsFixed(2)} \$';
  }

  String get formattedSpent {
    return '${spent.toStringAsFixed(2)} \$';
  }

  String get formattedRemaining {
    return '${remaining.toStringAsFixed(2)} \$';
  }
}