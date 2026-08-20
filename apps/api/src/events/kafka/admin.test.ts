import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeKafkaTopics } from './admin';
import { KAFKA_TOPICS } from './topics';
import { getKafkaClient } from './client';

vi.mock('./client', () => ({
  getKafkaClient: vi.fn(),
}));

describe('Kafka Admin Topic Initializer Unit Suite', () => {
  const originalEnv = process.env;

  const mockConnect = vi.fn();
  const mockDisconnect = vi.fn();
  const mockListTopics = vi.fn();
  const mockCreateTopics = vi.fn();

  const mockAdmin = {
    connect: mockConnect,
    disconnect: mockDisconnect,
    listTopics: mockListTopics,
    createTopics: mockCreateTopics,
  };

  const mockKafka = {
    admin: vi.fn().mockReturnValue(mockAdmin),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return false if Kafka client is not configured (getKafkaClient returns null)', async () => {
    vi.mocked(getKafkaClient).mockReturnValue(null);

    const result = await initializeKafkaTopics();

    expect(result).toBe(false);
    expect(mockAdmin.connect).not.toHaveBeenCalled();
  });

  it('should list existing topics and create all missing topics from KAFKA_TOPICS constants', async () => {
    vi.mocked(getKafkaClient).mockReturnValue(mockKafka as any);
    mockConnect.mockResolvedValue(undefined);
    mockListTopics.mockResolvedValue([]); // No existing topics
    mockCreateTopics.mockResolvedValue(true);
    mockDisconnect.mockResolvedValue(undefined);

    const result = await initializeKafkaTopics();

    expect(result).toBe(true);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockListTopics).toHaveBeenCalledTimes(1);
    expect(mockCreateTopics).toHaveBeenCalledWith({
      topics: Object.values(KAFKA_TOPICS).map((topic) => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1,
      })),
      waitForLeaders: true,
    });
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should be idempotent and skip creation when all required topics already exist', async () => {
    vi.mocked(getKafkaClient).mockReturnValue(mockKafka as any);
    mockConnect.mockResolvedValue(undefined);
    mockListTopics.mockResolvedValue(Object.values(KAFKA_TOPICS)); // All topics exist
    mockDisconnect.mockResolvedValue(undefined);

    const result = await initializeKafkaTopics();

    expect(result).toBe(true);
    expect(mockCreateTopics).not.toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should only create topics that are missing', async () => {
    vi.mocked(getKafkaClient).mockReturnValue(mockKafka as any);
    mockConnect.mockResolvedValue(undefined);
    // Only payment.completed exists
    mockListTopics.mockResolvedValue(['docdock.payment.completed']);
    mockCreateTopics.mockResolvedValue(true);

    const result = await initializeKafkaTopics();

    expect(result).toBe(true);
    const createTopicsArg = mockCreateTopics.mock.calls[0][0];
    const createdTopicNames = createTopicsArg.topics.map((t: any) => t.topic);

    expect(createdTopicNames).not.toContain('docdock.payment.completed');
    expect(createdTopicNames).toContain('docdock.appointment.created');
    expect(createdTopicNames).toContain('docdock.doctor.on_the_way');
    expect(createdTopicNames.length).toBe(Object.keys(KAFKA_TOPICS).length - 1);
  });

  it('should support custom numPartitions and replicationFactor options', async () => {
    vi.mocked(getKafkaClient).mockReturnValue(mockKafka as any);
    mockConnect.mockResolvedValue(undefined);
    mockListTopics.mockResolvedValue([]);
    mockCreateTopics.mockResolvedValue(true);

    await initializeKafkaTopics({ numPartitions: 3, replicationFactor: 2 });

    expect(mockCreateTopics).toHaveBeenCalledWith({
      topics: expect.arrayContaining([
        expect.objectContaining({
          numPartitions: 3,
          replicationFactor: 2,
        }),
      ]),
      waitForLeaders: true,
    });
  });

  it('should handle admin error gracefully and return false without crashing', async () => {
    vi.mocked(getKafkaClient).mockReturnValue(mockKafka as any);
    mockConnect.mockRejectedValue(new Error('Broker unreachable'));

    const result = await initializeKafkaTopics();

    expect(result).toBe(false);
    expect(mockDisconnect).toHaveBeenCalledTimes(1); // Ensures disconnect is called in finally
  });
});
