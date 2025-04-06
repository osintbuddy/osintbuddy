import { emptyApi as api } from "./baseApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    refreshEntityPlugins: build.query<
      RefreshEntityPluginsApiResponse,
      RefreshEntityPluginsApiArg
    >({
      query: () => ({ url: `/api/v1/node/refresh` }),
    }),
    createEntityOnDrop: build.mutation<
      CreateEntityOnDropApiResponse,
      CreateEntityOnDropApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/node/`,
        method: "POST",
        body: queryArg.createNode,
        params: { hid: queryArg.hid },
      }),
    }),
    runEntityTransform: build.mutation<
      RunEntityTransformApiResponse,
      RunEntityTransformApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/node/transform/`,
        method: "POST",
        body: queryArg.sourceEntity,
        params: { hid: queryArg.hid },
      }),
    }),
    postSignin: build.mutation<PostSigninApiResponse, PostSigninApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/auth/sign-in`,
        method: "POST",
        params: { code: queryArg.code },
      }),
    }),
    postSignout: build.mutation<PostSignoutApiResponse, PostSignoutApiArg>({
      query: () => ({ url: `/api/v1/auth/sign-out`, method: "POST" }),
    }),
    getAccount: build.query<GetAccountApiResponse, GetAccountApiArg>({
      query: () => ({ url: `/api/v1/account/` }),
    }),
    getGraph: build.query<GetGraphApiResponse, GetGraphApiArg>({
      query: (queryArg) => ({ url: `/api/v1/graph/${queryArg.hid}` }),
    }),
    getGraphs: build.query<GetGraphsApiResponse, GetGraphsApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/graph`,
        params: {
          skip: queryArg.skip,
          limit: queryArg.limit,
          favorite_skip: queryArg.favoriteSkip,
          favorite_limit: queryArg.favoriteLimit,
        },
      }),
    }),
    createGraph: build.mutation<CreateGraphApiResponse, CreateGraphApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/graph`,
        method: "POST",
        body: queryArg.graphCreate,
      }),
    }),
    deleteGraph: build.mutation<DeleteGraphApiResponse, DeleteGraphApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/graph`,
        method: "DELETE",
        params: { hid: queryArg.hid },
      }),
    }),
    getGraphsByFavorite: build.query<
      GetGraphsByFavoriteApiResponse,
      GetGraphsByFavoriteApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/graph/favorites`,
        params: {
          skip: queryArg.skip,
          limit: queryArg.limit,
          is_favorite: queryArg.isFavorite,
        },
      }),
    }),
    updateGraphFavoriteId: build.mutation<
      UpdateGraphFavoriteIdApiResponse,
      UpdateGraphFavoriteIdApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/graph/${queryArg.hid}/favorite/`,
        method: "PATCH",
      }),
    }),
    getGraphStats: build.query<GetGraphStatsApiResponse, GetGraphStatsApiArg>({
      query: (queryArg) => ({ url: `/api/v1/graph/${queryArg.hid}/stats` }),
    }),
    getEntityTransforms: build.query<
      GetEntityTransformsApiResponse,
      GetEntityTransformsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/entity/plugins/transform/`,
        params: { label: queryArg.label },
      }),
    }),
    getEntity: build.query<GetEntityApiResponse, GetEntityApiArg>({
      query: (queryArg) => ({ url: `/api/v1/entity/details/${queryArg.hid}` }),
    }),
    getEntities: build.query<GetEntitiesApiResponse, GetEntitiesApiArg>({
      query: () => ({ url: `/api/v1/entity` }),
    }),
    createEntity: build.mutation<CreateEntityApiResponse, CreateEntityApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/entity`,
        method: "POST",
        body: queryArg.postEntityCreate,
      }),
    }),
    updateEntityById: build.mutation<
      UpdateEntityByIdApiResponse,
      UpdateEntityByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/entity/${queryArg.hid}`,
        method: "PUT",
        body: queryArg.entityUpdate,
      }),
    }),
    deleteEntity: build.mutation<DeleteEntityApiResponse, DeleteEntityApiArg>({
      query: (queryArg) => ({
        url: `/api/v1/entity/${queryArg.hid}`,
        method: "DELETE",
      }),
    }),
    updateEntityFavoriteId: build.mutation<
      UpdateEntityFavoriteIdApiResponse,
      UpdateEntityFavoriteIdApiArg
    >({
      query: (queryArg) => ({
        url: `/api/v1/entity/${queryArg.hid}/favorite`,
        method: "PUT",
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as api };
export type RefreshEntityPluginsApiResponse =
  /** status 200 Successful Response */ any;
export type RefreshEntityPluginsApiArg = void;
export type CreateEntityOnDropApiResponse =
  /** status 200 Successful Response */ any;
export type CreateEntityOnDropApiArg = {
  hid: string;
  createNode: CreateNode;
};
export type RunEntityTransformApiResponse =
  /** status 200 Successful Response */ any;
export type RunEntityTransformApiArg = {
  hid: string;
  sourceEntity: object;
};
export type PostSigninApiResponse = /** status 200 Successful Response */
  | Status
  | HttpError;
export type PostSigninApiArg = {
  code: string;
};
export type PostSignoutApiResponse =
  /** status 200 Successful Response */ Status;
export type PostSignoutApiArg = void;
export type GetAccountApiResponse = /** status 200 Successful Response */
  | MemberInDbBase
  | HttpError;
export type GetAccountApiArg = void;
export type GetGraphApiResponse = /** status 200 Successful Response */ Graph;
export type GetGraphApiArg = {
  hid: string;
};
export type GetGraphsApiResponse =
  /** status 200 Successful Response */ AllGraphsList;
export type GetGraphsApiArg = {
  skip?: number;
  limit?: number;
  favoriteSkip?: number;
  favoriteLimit?: number;
};
export type CreateGraphApiResponse =
  /** status 200 Successful Response */ Graph;
export type CreateGraphApiArg = {
  graphCreate: GraphCreate;
};
export type DeleteGraphApiResponse = /** status 200 Successful Response */ any;
export type DeleteGraphApiArg = {
  hid: string;
};
export type GetGraphsByFavoriteApiResponse =
  /** status 200 Successful Response */ GraphsList;
export type GetGraphsByFavoriteApiArg = {
  skip?: number;
  limit?: number;
  isFavorite?: boolean;
};
export type UpdateGraphFavoriteIdApiResponse =
  /** status 200 Successful Response */ any;
export type UpdateGraphFavoriteIdApiArg = {
  hid: string;
};
export type GetGraphStatsApiResponse =
  /** status 200 Successful Response */ any;
export type GetGraphStatsApiArg = {
  hid: string;
};
export type GetEntityTransformsApiResponse =
  /** status 200 Successful Response */ any;
export type GetEntityTransformsApiArg = {
  label: string;
};
export type GetEntityApiResponse = /** status 200 Successful Response */ any;
export type GetEntityApiArg = {
  hid: any;
};
export type GetEntitiesApiResponse = /** status 200 Successful Response */ any;
export type GetEntitiesApiArg = void;
export type CreateEntityApiResponse = /** status 200 Successful Response */ any;
export type CreateEntityApiArg = {
  postEntityCreate: PostEntityCreate;
};
export type UpdateEntityByIdApiResponse =
  /** status 200 Successful Response */ any;
export type UpdateEntityByIdApiArg = {
  hid: string;
  entityUpdate: EntityUpdate;
};
export type DeleteEntityApiResponse = /** status 200 Successful Response */ any;
export type DeleteEntityApiArg = {
  hid: string;
};
export type UpdateEntityFavoriteIdApiResponse =
  /** status 200 Successful Response */ any;
export type UpdateEntityFavoriteIdApiArg = {
  hid: string;
};
export type ValidationError = {
  loc: (string | number)[];
  msg: string;
  type: string;
};
export type HttpValidationError = {
  detail?: ValidationError[];
};
export type XyPosition = {
  x: number;
  y: number;
};
export type CreateNode = {
  label: string;
  position: XyPosition;
};
export type Status = {
  status: string;
};
export type HttpError = {
  detail: string;
};
export type MemberInDbBase = {
  name: string;
  username?: string | null;
  email?: string | null;
  avatar?: string | null;
  phone?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  is_admin: boolean;
  created_time: string;
  updated_time: string;
  cid: string;
};
export type Graph = {
  label: string;
  description: string | null;
  is_favorite?: boolean;
  id: string;
  updated: string;
  created: string;
  last_seen: string;
};
export type AllGraphsList = {
  graphs: Graph[];
  count: number;
  favorite_graphs: Graph[];
  favorite_count: number;
};
export type GraphCreate = {
  label: string;
  description: string | null;
  is_favorite?: boolean;
};
export type GraphsList = {
  graphs: Graph[];
  count: number;
};
export type PostEntityCreate = {
  label: string;
  author: string;
  description: string;
};
export type EntityUpdate = {
  label?: string | null;
  author?: string | null;
  description?: string | null;
  source: string | null;
  is_favorite?: boolean;
};
export const {
  useRefreshEntityPluginsQuery,
  useCreateEntityOnDropMutation,
  useRunEntityTransformMutation,
  usePostSigninMutation,
  usePostSignoutMutation,
  useGetAccountQuery,
  useGetGraphQuery,
  useGetGraphsQuery,
  useCreateGraphMutation,
  useDeleteGraphMutation,
  useGetGraphsByFavoriteQuery,
  useUpdateGraphFavoriteIdMutation,
  useGetGraphStatsQuery,
  useGetEntityTransformsQuery,
  useGetEntityQuery,
  useGetEntitiesQuery,
  useCreateEntityMutation,
  useUpdateEntityByIdMutation,
  useDeleteEntityMutation,
  useUpdateEntityFavoriteIdMutation,
} = injectedRtkApi;
