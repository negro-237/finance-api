import '../../../core/config/api_config.dart';
import '../../../core/network/api_client.dart';
import '../models/budget.dart';

class BudgetRepository {
  final ApiClient apiClient;

  BudgetRepository({
    required this.apiClient,
  });

  /// Récupérer les budgets
  ///
  /// Peut être filtré par mois et année.
  Future<List<BudgetModel>> getBudgets({
    int? month,
    int? year,
  }) async {
    final response = await apiClient.dio.get(
      ApiConfig.budgets,
      queryParameters: {
        if (month != null) 'month': month,
        if (year != null) 'year': year,
      },
    );

    final data = response.data;

    if (data is! List) {
      throw Exception(
        'Format de réponse des budgets invalide.',
      );
    }

    return data
        .map(
          (item) => BudgetModel.fromJson(
            item as Map<String, dynamic>,
          ),
        )
        .toList();
  }

  /// Récupérer le résumé des budgets
  ///
  /// GET /budgets/summary?month=X&year=Y
  Future<List<BudgetModel>> getSummary({
    required int month,
    required int year,
  }) async {
    final response = await apiClient.dio.get(
      '${ApiConfig.budgets}/summary',
      queryParameters: {
        'month': month,
        'year': year,
      },
    );

    final data = response.data;

    if (data is! List) {
      throw Exception(
        'Format de réponse du résumé des budgets invalide.',
      );
    }

    return data
        .map(
          (item) => BudgetModel.fromJson(
            item as Map<String, dynamic>,
          ),
        )
        .toList();
  }

  /// Récupérer un budget
  Future<BudgetModel> getBudget(
    int id,
  ) async {
    final response = await apiClient.dio.get(
      '${ApiConfig.budgets}/$id',
    );

    return BudgetModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  /// Créer un budget
  Future<BudgetModel> createBudget({
    required int categoryId,
    required double amount,
    required int month,
    required int year,
  }) async {
    final response = await apiClient.dio.post(
      ApiConfig.budgets,
      data: {
        'categoryId': categoryId,
        'amount': amount,
        'month': month,
        'year': year,
      },
    );

    return BudgetModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  /// Modifier un budget
  Future<BudgetModel> updateBudget({
    required int id,
    double? amount,
    int? month,
    int? year,
  }) async {
    final response = await apiClient.dio.patch(
      '${ApiConfig.budgets}/$id',
      data: {
        if (amount != null) 'amount': amount,
        if (month != null) 'month': month,
        if (year != null) 'year': year,
      },
    );

    return BudgetModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  /// Supprimer un budget
  Future<void> deleteBudget(
    int id,
  ) async {
    await apiClient.dio.delete(
      '${ApiConfig.budgets}/$id',
    );
  }
}